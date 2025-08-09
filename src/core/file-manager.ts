import { join } from 'path'
import { readFile, writeFile, unlink } from 'fs/promises'
import { v4 as uuidv4 } from 'uuid'
import { Config } from './config'

/**
 * Custom error for file operation failures
 */
export class FileOperationError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message)
    this.name = 'FileOperationError'
  }
}

/**
 * Manages file operations for the knowledge base articles
 */
export class FileManager {
  constructor(private readonly config: Config) {}

  /**
   * Creates a new article with the given content
   * @param content The markdown content of the article
   * @returns The ID and file path of the created article
   */
  async createArticle(content: string): Promise<{ id: string; filePath: string }> {
    const id = uuidv4()
    const filePath = join(this.config.articlesPath, `${id}.md`)

    try {
      await writeFile(filePath, content, 'utf-8')
      return { id, filePath }
    } catch (err) {
      throw new FileOperationError(`Failed to create article: ${err instanceof Error ? err.message : String(err)}`, err as Error)
    }
  }

  /**
   * Reads the content of an existing article
   * @param filePath The path to the article file
   * @returns The content of the article
   */
  async readArticle(filePath: string): Promise<string> {
    try {
      return await readFile(filePath, 'utf-8')
    } catch (err) {
      throw new FileOperationError(`Failed to read article: ${err instanceof Error ? err.message : String(err)}`, err as Error)
    }
  }

  /**
   * Updates the content of an existing article
   * @param filePath The path to the article file
   * @param newContent The new content to write
   */
  async updateArticle(filePath: string, newContent: string): Promise<void> {
    try {
      await writeFile(filePath, newContent, 'utf-8')
    } catch (err) {
      throw new FileOperationError(`Failed to update article: ${err instanceof Error ? err.message : String(err)}`, err as Error)
    }
  }

  /**
   * Deletes an existing article
   * @param filePath The path to the article file
   */
  async deleteArticle(filePath: string): Promise<void> {
    try {
      await unlink(filePath)
    } catch (err) {
      throw new FileOperationError(`Failed to delete article: ${err instanceof Error ? err.message : String(err)}`, err as Error)
    }
  }
}
