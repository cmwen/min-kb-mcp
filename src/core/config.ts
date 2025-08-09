import { join } from 'path'
import { mkdirSync } from 'fs'
import getAppdataPath from 'appdata-path'

/**
 * Configuration manager for the Personal Knowledge Base
 * Handles path resolution and directory creation for a specific knowledge base
 */
export class Config {
  private readonly kbRootPath: string
  public readonly dbPath: string
  public readonly articlesPath: string
  public readonly transport: 'stdio' | 'http' = 'stdio'
  public readonly httpPort: number = 3000

  /**
   * Creates a new Config instance for the specified knowledge base
   * @param kbName The name of the knowledge base
   */
  constructor(kbName: string) {
    if (!kbName) {
      throw new Error('Knowledge base name is required')
    }
    
    // Set transport based on environment variable
    if (process.env.MCP_TRANSPORT === 'http') {
      this.transport = 'http'
      this.httpPort = parseInt(process.env.MCP_PORT || '3000', 10)
    }

    // Resolve the root path for this knowledge base
    this.kbRootPath = join(getAppdataPath('min-kb-mcp'), kbName)
    
    // Derive other paths
    this.dbPath = join(this.kbRootPath, `${kbName}.sqlite`)
    this.articlesPath = join(this.kbRootPath, 'articles')

    // Ensure directories exist
    this.ensureDirectories()
  }

  /**
   * Creates all necessary directories for the knowledge base
   * @private
   */
  private ensureDirectories(): void {
    mkdirSync(this.kbRootPath, { recursive: true })
    mkdirSync(this.articlesPath, { recursive: true })
  }
}
