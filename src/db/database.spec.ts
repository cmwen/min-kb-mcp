import { mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DatabaseService } from './database'

function makeTempDir() {
  const dir = mkdtempSync(join(tmpdir(), 'min-kb-mcp-'))
  return dir
}

describe('DatabaseService (WASM)', () => {
  let dir: string
  let dbPath: string
  let db: DatabaseService

  beforeEach(async () => {
    dir = makeTempDir()
    dbPath = join(dir, 'test.sqlite')
    db = new DatabaseService(dbPath)
    // Give time for async init to complete on first use
    await db.indexArticle({
      id: 'bootstrap',
      filePath: '/dev/null',
      content: 'bootstrap',
      title: 'bootstrap',
      keywords: 'init',
    })
    await db.deindexArticle('bootstrap')
  })

  afterEach(() => {
    db.close()
    rmSync(dir, { recursive: true, force: true })
  })

  it('indexes and searches articles', async () => {
    await db.indexArticle({
      id: 'a1',
      filePath: '/a1.md',
      content: '# Hello World\nThis is a test document about SQLite and FTS.',
      title: 'Hello World',
      keywords: 'sqlite,fts',
    })

    const results = await db.search('SQLite', 5)
    expect(Array.isArray(results)).toBe(true)
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].id).toBe('a1')
  })

  it('lists articles with pagination', async () => {
    for (let i = 0; i < 15; i++) {
      await db.indexArticle({
        id: `id-${i}`,
        filePath: `/file-${i}.md`,
        content: `# Title ${i}\ncontent ${i}`,
        title: `Title ${i}`,
        keywords: `k${i}`,
      })
    }
    const page1 = await db.listArticles(1, 10)
    const page2 = await db.listArticles(2, 10)
    expect(page1.length).toBe(10)
    expect(page2.length).toBe(5)
  })

  it('deindexes articles', async () => {
    await db.indexArticle({
      id: 'gone',
      filePath: '/gone.md',
      content: 'some text',
      title: 'Gone',
      keywords: 'k',
    })
    await db.deindexArticle('gone')
    const results = await db.search('some text', 5)
    // FTS or LIKE fallback should not find deleted entry
    const ids = results.map((r) => r.id)
    expect(ids.includes('gone')).toBe(false)
  })
})
