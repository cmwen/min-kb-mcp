import Database from 'better-sqlite3'
import removeMarkdown from 'remove-markdown'
import type { Database as DatabaseType } from 'better-sqlite3'

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
  constructor(message: string, public readonly cause?: Error) {
    super(message)
    this.name = 'DatabaseError'
  }
}

/**
 * Manages all database operations for the knowledge base
 */
export class DatabaseService {
  private db: DatabaseType

  constructor(dbPath: string) {
    try {
      this.db = new Database(dbPath)
      this.init()
    } catch (err) {
      throw new DatabaseError(`Failed to initialize database: ${err instanceof Error ? err.message : String(err)}`, err as Error)
    }
  }

  /**
   * Initializes the database schema
   * @private
   */
  private init(): void {
    this.db.transaction(() => {
      // Create the main articles table
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS articles (
          id TEXT PRIMARY KEY,
          filePath TEXT NOT NULL,
          title TEXT,
          keywords TEXT
        )
      `)

      // Create the FTS table for content searching
      this.db.exec(`
        CREATE VIRTUAL TABLE IF NOT EXISTS articles_fts USING fts5(
          id UNINDEXED,
          content,
          tokenize = 'porter'
        )
      `)
    })()
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
    try {
      const title = article.title || this.extractTitle(article.content)
      const cleanContent = removeMarkdown(article.content)

      this.db.transaction(() => {
        // Insert/update the main article record
        this.db.prepare(`
          INSERT OR REPLACE INTO articles (id, filePath, title, keywords)
          VALUES (?, ?, ?, ?)
        `).run(article.id, article.filePath, title, article.keywords)

        // Insert/update the FTS content
        this.db.prepare(`
          INSERT OR REPLACE INTO articles_fts (id, content)
          VALUES (?, ?)
        `).run(article.id, cleanContent)
      })()
    } catch (err) {
      throw new DatabaseError(`Failed to index article: ${err instanceof Error ? err.message : String(err)}`, err as Error)
    }
  }

  /**
   * Removes an article from the index
   * @param id The ID of the article to remove
   */
  async deindexArticle(id: string): Promise<void> {
    try {
      this.db.transaction(() => {
        this.db.prepare('DELETE FROM articles WHERE id = ?').run(id)
        this.db.prepare('DELETE FROM articles_fts WHERE id = ?').run(id)
      })()
    } catch (err) {
      throw new DatabaseError(`Failed to deindex article: ${err instanceof Error ? err.message : String(err)}`, err as Error)
    }
  }

  /**
   * Searches for articles using FTS
   * @param query The search query
   * @param limit Optional limit on the number of results
   * @returns Array of search results
   */
  async search(query: string, limit = 10): Promise<SearchResult[]> {
    try {
      return this.db.prepare(`
        SELECT
          a.id,
          a.filePath,
          a.title,
          a.keywords,
          fts.rank
        FROM articles_fts fts
        JOIN articles a ON fts.id = a.id
        WHERE fts.content MATCH ?
        ORDER BY fts.rank
        LIMIT ?
      `).all(query, limit) as SearchResult[]
    } catch (err) {
      throw new DatabaseError(`Failed to search articles: ${err instanceof Error ? err.message : String(err)}`, err as Error)
    }
  }

  /**
   * Closes the database connection
   */
  close(): void {
    this.db.close()
  }
}
