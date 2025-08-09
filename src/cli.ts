#!/usr/bin/env node
console.log('CLI script starting...')

import { Command } from 'commander'
import { Config } from './core/config'
import { MCPServer } from './server'

// Catch any uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error)
  process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
  process.exit(1)
})

console.log('Starting CLI with environment:', {
  NODE_ENV: process.env.NODE_ENV,
  MCP_TRANSPORT: process.env.MCP_TRANSPORT,
  MCP_PORT: process.env.MCP_PORT,
})

const program = new Command()

program.name('personal-kb-mcp').description('Personal Knowledge Base MCP Server').version('0.1.0')

program
  .command('start')
  .description('Start the MCP server')
  .requiredOption('--kb <name>', 'Name of the knowledge base')
  .option('--port <number>', 'Port number for HTTP transport')
  .option('--host <hostname>', 'Host for HTTP transport')
  .action(async (options) => {
    console.log('CLI action handler starting...')
    let server: MCPServer | undefined

    const cleanup = async () => {
      console.log('Cleanup handler called')
      if (server) {
        console.log('\nShutting down MCP server...')
        await server.stop()
        process.exit(0)
      }
    }

    // Handle graceful shutdown
    process.on('SIGINT', cleanup)
    process.on('SIGTERM', cleanup)

    try {
      console.log('Creating config...')
      // Create config with transport options
      const config = new Config(options.kb, options.port ? parseInt(options.port, 10) : undefined)
      console.log('Config created:', {
        kb: options.kb,
        transport: config.transport,
        httpPort: config.httpPort,
        env: {
          MCP_TRANSPORT: process.env.MCP_TRANSPORT,
          MCP_PORT: process.env.MCP_PORT,
        },
      })

      console.log('Initializing server...')
      server = new MCPServer(config)
      console.log('Starting server...')
      await server.start()

      console.log(`MCP server started for knowledge base: ${options.kb}`)
      if (process.env.MCP_TRANSPORT === 'http') {
        console.log(`HTTP transport listening on port ${config.httpPort}`)
      }
      console.log('Server startup completed successfully')
    } catch (error) {
      console.error(
        'Failed to start server:',
        error instanceof Error ? error.message : String(error)
      )
      if (error instanceof Error && error.stack) {
        console.error('Stack trace:', error.stack)
      }
      process.exit(1)
    }
  })

// Since we use async actions, we need to use parseAsync
program.parseAsync().catch((error) => {
  console.error('Failed to parse CLI:', error)
  process.exit(1)
})
