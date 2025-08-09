import { McpServer, ExtendedTool } from '@mcp/sdk'
import { Config } from './core/config'
import { FileManager } from './core/file-manager'
import { DatabaseService } from './db/database'

export class MCPServer {
  private server: McpServer
  private fileManager: FileManager
  private db: DatabaseService

  constructor(private readonly config: Config) {
    this.fileManager = new FileManager(config)
    this.db = new DatabaseService(config.dbPath)
    this.server = new McpServer()
    this.registerTools()
  }

  /**
   * Registers all MCP tools
   * @private
   */
  private registerTools(): void {
    this.server.registerTool(this.createArticleTool())
    this.server.registerTool(this.getArticleTool())
    this.server.registerTool(this.updateArticleTool())
    this.server.registerTool(this.deleteArticleTool())
    this.server.registerTool(this.searchArticlesTool())
    this.server.registerTool(this.findLinkedArticlesTool())
    this.server.registerTool(this.getArticlesByTimeRangeTool())
    this.server.registerTool(this.listArticlesTool())
    this.server.registerTool(this.getArticleStatsTool())
  }

  /**
   * Tool to create a new article
   * @private
   */
  private createArticleTool(): ExtendedTool {
    return {
      name: 'createArticle',
      description: 'Creates a new article with the given content and optional keywords',
      parameters: {
        content: { type: 'string', description: 'The markdown content of the article' },
        keywords: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional keywords for the article',
          optional: true,
        },
      },
      handler: async ({ content, keywords }) => {
        try {
          const { id, filePath } = await this.fileManager.createArticle(content)
          await this.db.indexArticle({
            id,
            filePath,
            content,
            keywords: keywords?.join(','),
          })
          return { id, filePath }
        } catch (error) {
          if (error instanceof Error) {
            throw new Error(`Failed to create article: ${error.message}`)
          }
          throw error
        }
      },
    }
  }

  /**
   * Tool to get an article by ID
   * @private
   */
  private getArticleTool(): ExtendedTool {
    return {
      name: 'getArticle',
      description: 'Retrieves an article by its ID',
      parameters: {
        id: { type: 'string', description: 'The ID of the article to retrieve' },
      },
      handler: async ({ id }) => {
        try {
          const filePath = `${this.config.articlesPath}/${id}.md`
          const content = await this.fileManager.readArticle(filePath)
          return { content, filePath }
        } catch (error) {
          if (error instanceof Error) {
            throw new Error(`Failed to get article: ${error.message}`)
          }
          throw error
        }
      },
    }
  }

  /**
   * Tool to update an existing article
   * @private
   */
  private updateArticleTool(): ExtendedTool {
    return {
      name: 'updateArticle',
      description: 'Updates an existing article',
      parameters: {
        id: { type: 'string', description: 'The ID of the article to update' },
        content: { type: 'string', description: 'The new content for the article' },
        keywords: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional new keywords for the article',
          optional: true,
        },
      },
      handler: async ({ id, content, keywords }) => {
        try {
          const filePath = `${this.config.articlesPath}/${id}.md`
          await this.fileManager.updateArticle(filePath, content)
          await this.db.indexArticle({
            id,
            filePath,
            content,
            keywords: keywords?.join(','),
          })
          return { success: true }
        } catch (error) {
          if (error instanceof Error) {
            throw new Error(`Failed to update article: ${error.message}`)
          }
          throw error
        }
      },
    }
  }

  /**
   * Tool to delete an article
   * @private
   */
  private deleteArticleTool(): ExtendedTool {
    return {
      name: 'deleteArticle',
      description: 'Deletes an article by its ID',
      parameters: {
        id: { type: 'string', description: 'The ID of the article to delete' },
      },
      handler: async ({ id }) => {
        try {
          const filePath = `${this.config.articlesPath}/${id}.md`
          await this.fileManager.deleteArticle(filePath)
          await this.db.deindexArticle(id)
          return { success: true }
        } catch (error) {
          if (error instanceof Error) {
            throw new Error(`Failed to delete article: ${error.message}`)
          }
          throw error
        }
      },
    }
  }

  /**
   * Tool to search articles
   * @private
   */
  private searchArticlesTool(): ExtendedTool {
    return {
      name: 'searchArticles',
      description: 'Searches articles using full-text search',
      parameters: {
        query: { type: 'string', description: 'The search query' },
        timeRange: {
          type: 'object',
          properties: {
            start: { type: 'string', description: 'Start time (ISO 8601)' },
            end: { type: 'string', description: 'End time (ISO 8601)' },
          },
          optional: true,
        },
        timeField: {
          type: 'string',
          enum: ['created', 'modified'],
          description: 'Which timestamp to filter on',
          optional: true,
        },
      },
      handler: async ({ query, timeRange, timeField }) => {
        try {
          return await this.db.search(query)
        } catch (error) {
          if (error instanceof Error) {
            throw new Error(`Failed to search articles: ${error.message}`)
          }
          throw error
        }
      },
    }
  }

  /**
   * Tool to find linked articles
   * @private
   */
  private findLinkedArticlesTool(): ExtendedTool {
    return {
      name: 'findLinkedArticles',
      description: 'Finds articles that share keywords with the specified article',
      parameters: {
        id: { type: 'string', description: 'The ID of the article to find links for' },
      },
      handler: async ({ id }) => {
        // This will be implemented in a future update
        return { links: [] }
      },
    }
  }

  /**
   * Tool to get articles by time range
   * @private
   */
  private getArticlesByTimeRangeTool(): ExtendedTool {
    return {
      name: 'getArticlesByTimeRange',
      description: 'Retrieves articles within a specific time range',
      parameters: {
        startTime: {
          type: 'string',
          description: 'Start time (ISO 8601)',
          optional: true,
        },
        endTime: {
          type: 'string',
          description: 'End time (ISO 8601)',
          optional: true,
        },
        type: {
          type: 'string',
          enum: ['created', 'modified'],
          description: 'Which timestamp to filter on',
        },
      },
      handler: async ({ startTime, endTime, type }) => {
        // This will be implemented in a future update
        return { articles: [] }
      },
    }
  }

  /**
   * Tool to list all articles
   * @private
   */
  private listArticlesTool(): ExtendedTool {
    return {
      name: 'listArticles',
      description: 'Lists all articles in the knowledge base',
      parameters: {},
      handler: async () => {
        // This will be implemented in a future update
        return { articles: [] }
      },
    }
  }

  /**
   * Tool to get article statistics
   * @private
   */
  private getArticleStatsTool(): ExtendedTool {
    return {
      name: 'getArticleStats',
      description: 'Returns statistics about articles',
      parameters: {
        timeRange: {
          type: 'object',
          properties: {
            start: { type: 'string', description: 'Start time (ISO 8601)' },
            end: { type: 'string', description: 'End time (ISO 8601)' },
          },
          optional: true,
        },
      },
      handler: async ({ timeRange }) => {
        // This will be implemented in a future update
        return { stats: {} }
      },
    }
  }

  /**
   * Starts the MCP server
   */
  async start(): Promise<void> {
    await this.server.start()
  }

  /**
   * Stops the MCP server and cleans up resources
   */
  async stop(): Promise<void> {
    this.db.close()
    await this.server.stop()
  }
}
