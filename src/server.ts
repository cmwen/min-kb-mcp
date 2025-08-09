import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import express from 'express'
import cors from 'cors'
import { z } from 'zod'
import { randomUUID } from 'crypto'
import { Config } from './core/config'
import { FileManager } from './core/file-manager'
import { DatabaseService } from './db/database'

export class MCPServer {
  private server: McpServer
  private fileManager: FileManager
  private db: DatabaseService
  private transport: StdioServerTransport | StreamableHTTPServerTransport
  private app?: express.Application
  private transports: { [sessionId: string]: StreamableHTTPServerTransport } = {}

  constructor(private readonly config: Config) {
    this.fileManager = new FileManager(config)
    this.db = new DatabaseService(config.dbPath)
    this.server = new McpServer({
      name: 'personal-kb',
      version: '1.0.0'
    })

    if (config.transport === 'http') {
      // In development, we can disable DNS rebinding protection
      // In production, you should configure allowedHosts appropriately
      this.transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        enableDnsRebindingProtection: false  // Allow connections from any host in development
      })
    } else {
      this.transport = new StdioServerTransport()
    }
    
    if (config.transport === 'http') {
      this.setupHttpTransport()
    }

    this.registerTools()
    this.registerResources()
  }

  /**
   * Registers all MCP tools
   * @private
   */
  private registerTools(): void {
    // Create Article Tool
    this.server.registerTool(
      'createArticle',
      {
        title: 'Create Article',
        description: 'Creates a new article with the given content and optional keywords',
        inputSchema: {
          content: z.string().describe('The markdown content of the article'),
          keywords: z.array(z.string()).optional().describe('Optional keywords for the article'),
          title: z.string().optional().describe('Optional title for the article')
        }
      },
      async ({ content, keywords, title }) => {
        try {
          const { id, filePath } = await this.fileManager.createArticle(content)
          await this.db.indexArticle({
            id,
            filePath,
            content,
            title,
            keywords: keywords?.join(','),
          })
          return {
            content: [
              { type: 'text', text: `Article created successfully.` },
              {
                type: 'resource_link',
                uri: `article://${id}`,
                name: title || 'New Article',
                mimeType: 'text/markdown',
                description: `Article: ${title || id}`
              }
            ]
          }
        } catch (error) {
          return {
            content: [{
              type: 'text',
              text: `Failed to create article: ${error instanceof Error ? error.message : 'Unknown error'}`
            }],
            isError: true
          }
        }
      }
    )

    // Search Articles Tool
    this.server.registerTool(
      'searchArticles',
      {
        title: 'Search Articles',
        description: 'Searches articles using full-text search',
        inputSchema: {
          query: z.string().describe('The search query'),
          limit: z.number().optional().describe('Maximum number of results to return')
        }
      },
      async ({ query, limit = 10 }) => {
        try {
          const results = await this.db.search(query, limit)
          return {
            content: [
              { type: 'text', text: `Found ${results.length} articles:` },
              ...results.map(result => ({
                type: 'resource_link',
                uri: `article://${result.id}`,
                name: result.title || result.id,
                mimeType: 'text/markdown',
                description: `Relevance: ${result.rank}`
              }))
            ]
          }
        } catch (error) {
          return {
            content: [{
              type: 'text',
              text: `Failed to search articles: ${error instanceof Error ? error.message : 'Unknown error'}`
            }],
            isError: true
          }
        }
      }
    )

    // Update Article Tool
    this.server.registerTool(
      'updateArticle',
      {
        title: 'Update Article',
        description: 'Updates an existing article',
        inputSchema: {
          id: z.string().describe('The ID of the article to update'),
          content: z.string().describe('The new content for the article'),
          keywords: z.array(z.string()).optional().describe('Optional new keywords'),
          title: z.string().optional().describe('Optional new title')
        }
      },
      async ({ id, content, keywords, title }) => {
        try {
          const filePath = `${this.config.articlesPath}/${id}.md`
          await this.fileManager.updateArticle(filePath, content)
          await this.db.indexArticle({
            id,
            filePath,
            content,
            title,
            keywords: keywords?.join(','),
          })
          return {
            content: [
              { type: 'text', text: 'Article updated successfully.' },
              {
                type: 'resource_link',
                uri: `article://${id}`,
                name: title || id,
                mimeType: 'text/markdown',
                description: `Updated article: ${title || id}`
              }
            ]
          }
        } catch (error) {
          return {
            content: [{
              type: 'text',
              text: `Failed to update article: ${error instanceof Error ? error.message : 'Unknown error'}`
            }],
            isError: true
          }
        }
      }
    )

    // Delete Article Tool
    this.server.registerTool(
      'deleteArticle',
      {
        title: 'Delete Article',
        description: 'Deletes an existing article',
        inputSchema: {
          id: z.string().describe('The ID of the article to delete')
        }
      },
      async ({ id }) => {
        try {
          const filePath = `${this.config.articlesPath}/${id}.md`
          await this.fileManager.deleteArticle(filePath)
          await this.db.deindexArticle(id)
          return {
            content: [{
              type: 'text',
              text: `Article ${id} deleted successfully.`
            }]
          }
        } catch (error) {
          return {
            content: [{
              type: 'text',
              text: `Failed to delete article: ${error instanceof Error ? error.message : 'Unknown error'}`
            }],
            isError: true
          }
        }
      }
    )

    // Register other tools similarly...
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
   * Sets up HTTP transport with Express
   * @private
   */
  private setupHttpTransport(): void {
    this.app = express()
    this.app.use(express.json())
    
    // Configure CORS
    this.app.use(cors({
      origin: '*',  // Configure appropriately for production
      exposedHeaders: ['Mcp-Session-Id'],
      allowedHeaders: ['Content-Type', 'mcp-session-id'],
    }))

    this.app.post('/mcp', async (req, res) => {
      const sessionId = req.headers['mcp-session-id'] as string | undefined
      
      if (sessionId && this.transports[sessionId]) {
        await this.transports[sessionId].handleRequest(req, res, req.body)
      } else {
        const transport = this.transport as StreamableHTTPServerTransport
        await transport.handleRequest(req, res, req.body)
        
        if (transport.sessionId) {
          this.transports[transport.sessionId] = transport
        }
      }
    })

    // Handle GET requests for server-to-client notifications
    this.app.get('/mcp', this.handleSessionRequest.bind(this))

    // Handle DELETE requests for session termination
    this.app.delete('/mcp', this.handleSessionRequest.bind(this))

    // Start HTTP server
    this.app.listen(this.config.httpPort, () => {
      console.log(`MCP HTTP server listening on port ${this.config.httpPort}`)
    })
  }

  /**
   * Handles session-based requests (GET/DELETE)
   * @private
   */
  private async handleSessionRequest(req: express.Request, res: express.Response): Promise<void> {
    const sessionId = req.headers['mcp-session-id'] as string | undefined
    if (!sessionId || !this.transports[sessionId]) {
      res.status(400).send('Invalid or missing session ID')
      return
    }
    
    const transport = this.transports[sessionId]
    await transport.handleRequest(req, res)
  }

  /**
   * Register resources
   * @private
   */
  private registerResources(): void {
    this.server.registerResource(
      'article',
      new ResourceTemplate('article://{id}', { list: undefined }),
      {
        title: 'Article Resource',
        description: 'Access to individual articles in the knowledge base'
      },
      async (uri, { id }) => {
        try {
          const filePath = `${this.config.articlesPath}/${id}.md`
          const content = await this.fileManager.readArticle(filePath)
          return {
            contents: [{
              uri: uri.href,
              text: content,
              mimeType: 'text/markdown'
            }]
          }
        } catch (error) {
          throw new Error(`Article not found: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }
    )
  }

  /**
   * Starts the MCP server
   */
  async start(): Promise<void> {
    if (this.config.transport === 'stdio') {
      await this.server.connect(this.transport as StdioServerTransport)
    } else {
      // For HTTP transport, we need to connect the transport to the server
      await this.server.connect(this.transport as StreamableHTTPServerTransport)
    }
  }

  /**
   * Stops the MCP server and cleans up resources
   */
  async stop(): Promise<void> {
    this.db.close()
    
    if (this.config.transport === 'stdio') {
      (this.transport as StdioServerTransport).close()
    } else {
      // Close all HTTP transports
      Object.values(this.transports).forEach(t => t.close())
    }
  }
}
