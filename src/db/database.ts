import { existsSync, readFileSync, writeFileSync } from 'fs'
import { createRequire } from 'module'
import removeMarkdown from 'remove-markdown'
import initSqlJs, { Database as SqlJsDatabase, SqlJsStatic } from 'sql.js'

interface Article {
  id: string
  filePath: string
  title?: string
  keywords?: string
  content: string
}

interface SearchResult {
  id: string
  filePath: string
  title: string | null
  keywords: string | null
  rank: number
}

/**
 * Custom error for database operation failures
 */
export class DatabaseError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error
  ) {
    super(message)
    this.name = 'DatabaseError'
  }
}

/**
 * Manages all database operations for the knowledge base
 */
export class DatabaseService {
  private db!: SqlJsDatabase
  private SQL!: SqlJsStatic
  private ready: Promise<void>
  private ftsAvailable = false
  private dbPath: string

  constructor(dbPath: string) {
    this.dbPath = dbPath
    this.ready = this.initialize(dbPath)
  }

  private async initialize(dbPath: string): Promise<void> {
    try {
      const require = createRequire(__filename)
      const locateFile = (file: string) => require.resolve(`sql.js/dist/${file}`)
      this.SQL = await initSqlJs({ locateFile })

      if (existsSync(dbPath)) {
        const fileBuffer = readFileSync(dbPath)
        this.db = new this.SQL.Database(fileBuffer)
      } else {
        this.db = new this.SQL.Database()
      }

      this.initSchema()
      // Attempt to persist right away to ensure file exists
      this.persist(dbPath)
    } catch (err) {
      throw new DatabaseError(
        `Failed to initialize database: ${err instanceof Error ? err.message : String(err)}`,
        err as Error
      )
    }
  }

  /**
   * Initializes the database schema and detects FTS5 support
   * @private
   */
  private initSchema(): void {
    // Create the main articles table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS articles (
        id TEXT PRIMARY KEY,
        filePath TEXT NOT NULL,
        title TEXT,
        keywords TEXT
      );
    `)

    // Content table for fallback search or to keep content accessible
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS articles_content (
        id TEXT PRIMARY KEY,
        content TEXT NOT NULL
      );
    `)

    // Try to create FTS5 table with porter tokenizer; fall back progressively
    this.ftsAvailable = false
    try {
      this.db.exec(`
        CREATE VIRTUAL TABLE IF NOT EXISTS articles_fts USING fts5(
          id UNINDEXED,
          content,
          tokenize='porter'
        );
      `)
      this.ftsAvailable = true
    } catch (_) {
      try {
        // Try without porter tokenizer
        this.db.exec(`
          CREATE VIRTUAL TABLE IF NOT EXISTS articles_fts USING fts5(
            id UNINDEXED,
            content
          );
        `)
        this.ftsAvailable = true
      } catch {
        // FTS5 not available in this build
        this.ftsAvailable = false
      }
    }
  }

  private persist(dbPath: string): void {
    const data = this.db.export()
    writeFileSync(dbPath, Buffer.from(data))
  }

  /**
   * Extracts title from markdown content
   * @private
   */
  private extractTitle(content: string): string | undefined {
    const match = content.match(/^#\s+(.+)$/m)
    return match ? match[1].trim() : undefined
  }

  /**
   * Indexes an article in the database
   * @param article The article to index
   */
  async indexArticle(article: Article): Promise<void> {
    await this.ready
    try {
      const title = article.title || this.extractTitle(article.content)
      const cleanContent = removeMarkdown(article.content)

      // Upsert core tables
      this.db.run(
        `INSERT INTO articles (id, filePath, title, keywords)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET filePath=excluded.filePath, title=excluded.title, keywords=excluded.keywords;`,
        [article.id, article.filePath, title ?? null, article.keywords ?? null]
      )

      this.db.run(
        `INSERT INTO articles_content (id, content)
         VALUES (?, ?)
         ON CONFLICT(id) DO UPDATE SET content=excluded.content;`,
        [article.id, cleanContent]
      )

      // Update FTS if available
      if (this.ftsAvailable) {
        try {
          // Simple delete + insert to emulate upsert
          this.db.run('DELETE FROM articles_fts WHERE id = ?', [article.id])
          this.db.run('INSERT INTO articles_fts (id, content) VALUES (?, ?)', [
            article.id,
            cleanContent,
          ])
        } catch {
          // Ignore FTS errors; keep core tables consistent
        }
      }
      // Persist changes to disk
      this.persist(this.dbPath)
    } catch (err) {
      throw new DatabaseError(
        `Failed to index article: ${err instanceof Error ? err.message : String(err)}`,
        err as Error
      )
    }
  }

  /**
   * Removes an article from the index
   * @param id The ID of the article to remove
   */
  async deindexArticle(id: string): Promise<void> {
    await this.ready
    try {
      this.db.exec('BEGIN')
      this.db.run('DELETE FROM articles WHERE id = ?', [id])
      this.db.run('DELETE FROM articles_content WHERE id = ?', [id])
      if (this.ftsAvailable) {
        try {
          this.db.run('DELETE FROM articles_fts WHERE id = ?', [id])
        } catch {
          // ignore
        }
      }
      this.db.exec('COMMIT')
      this.persist(this.dbPath)
    } catch (err) {
      this.db.exec('ROLLBACK')
      throw new DatabaseError(
        `Failed to deindex article: ${err instanceof Error ? err.message : String(err)}`,
        err as Error
      )
    }
  }

  /**
   * Searches for articles using FTS
   * @param query The search query
   * @param limit Optional limit on the number of results
   * @returns Array of search results
   */
  async search(query: string, limit = 10): Promise<SearchResult[]> {
    await this.ready
    try {
      if (this.ftsAvailable) {
        // Try using bm25 ranking if available
        try {
          const stmt = this.db.prepare(`
            SELECT a.id, a.filePath, a.title, a.keywords, bm25(articles_fts) AS rank
            FROM articles_fts
            JOIN articles a ON articles_fts.id = a.id
            WHERE articles_fts MATCH ?
            ORDER BY rank
            LIMIT ?;
          `)
          const results: SearchResult[] = []
          stmt.bind([query, limit])
          while (stmt.step()) {
            const row = stmt.getAsObject() as {
              id?: unknown
              filePath?: unknown
              title?: unknown
              keywords?: unknown
              rank?: unknown
            }
            results.push({
              id: String(row.id ?? ''),
              filePath: String(row.filePath ?? ''),
              title: (row.title as string | null) ?? null,
              keywords: (row.keywords as string | null) ?? null,
              rank: typeof row.rank === 'number' ? (row.rank as number) : 0,
            })
          }
          stmt.free()
          return results
        } catch {
          // Fallback without bm25 ordering
          const stmt = this.db.prepare(`
            SELECT a.id, a.filePath, a.title, a.keywords, 0 AS rank
            FROM articles_fts
            JOIN articles a ON articles_fts.id = a.id
            WHERE articles_fts MATCH ?
            LIMIT ?;
          `)
          const results: SearchResult[] = []
          stmt.bind([query, limit])
          while (stmt.step()) {
            const row = stmt.getAsObject() as {
              id?: unknown
              filePath?: unknown
              title?: unknown
              keywords?: unknown
            }
            results.push({
              id: String(row.id ?? ''),
              filePath: String(row.filePath ?? ''),
              title: (row.title as string | null) ?? null,
              keywords: (row.keywords as string | null) ?? null,
              rank: 0,
            })
          }
          stmt.free()
          return results
        }
      }

      // Fallback: naive LIKE search on content table
      const like = `%${query}%`
      const stmt = this.db.prepare(`
        SELECT a.id, a.filePath, a.title, a.keywords, 0 AS rank
        FROM articles_content c
        JOIN articles a ON c.id = a.id
        WHERE c.content LIKE ?
        LIMIT ?;
      `)
      const results: SearchResult[] = []
      stmt.bind([like, limit])
      while (stmt.step()) {
        const row = stmt.getAsObject() as {
          id?: unknown
          filePath?: unknown
          title?: unknown
          keywords?: unknown
        }
        results.push({
          id: String(row.id ?? ''),
          filePath: String(row.filePath ?? ''),
          title: (row.title as string | null) ?? null,
          keywords: (row.keywords as string | null) ?? null,
          rank: 0,
        })
      }
      stmt.free()
      return results
    } catch (err) {
      throw new DatabaseError(
        `Failed to search articles: ${err instanceof Error ? err.message : String(err)}`,
        err as Error
      )
    }
  }

  /**
   * Lists articles with pagination
   * @param page The page number (1-indexed)
   * @param size The number of items per page
   * @returns Array of articles
   */
  async listArticles(page: number, size: number): Promise<Article[]> {
    await this.ready
    try {
      const offset = (page - 1) * size
      const stmt = this.db.prepare(
        'SELECT id, filePath, title, keywords FROM articles LIMIT ? OFFSET ?;'
      )
      const results: Article[] = []
      stmt.bind([size, offset])
      while (stmt.step()) {
        const row = stmt.getAsObject() as {
          id?: unknown
          filePath?: unknown
          title?: unknown
          keywords?: unknown
        }
        results.push({
          id: String(row.id ?? ''),
          filePath: String(row.filePath ?? ''),
          title: (row.title as string | undefined) ?? undefined,
          keywords: (row.keywords as string | undefined) ?? undefined,
          content: '',
        })
      }
      stmt.free()
      return results
    } catch (err) {
      throw new DatabaseError(
        `Failed to list articles: ${err instanceof Error ? err.message : String(err)}`,
        err as Error
      )
    }
  }

  /**
   * Closes the database connection
   */
  close(): void {
    if (this.db) {
      try {
        this.persist(this.dbPath)
      } catch {
        // ignore persist errors on close
      }
      this.db.close()
    }
  }
}
