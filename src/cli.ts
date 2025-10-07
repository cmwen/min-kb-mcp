#!/usr/bin/env node

import { Command } from 'commander'
import { readFileSync } from 'fs'
import { join } from 'path'
import { Config } from './core/config'
import { MCPServer } from './server'

// Read version from package.json
const packageJson = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'))
const VERSION = packageJson.version

// Catch any uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error)
  process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
  process.exit(1)
})

const program = new Command()

program
  .name('min-kb-mcp')
  .description('A minimalist, file-based knowledge base server (MCP) for LLMs')
  .version(VERSION)

program
  .command('start')
  .description('Start the MCP server')
  .requiredOption('--kb <name>', 'Name of the knowledge base')
  .option('--port <number>', 'Port number for HTTP transport')
  .option('--host <hostname>', 'Host for HTTP transport')
  .action(async (options) => {
    let server: MCPServer | undefined
    const isDebugMode = process.env.DEBUG === '*' || process.env.NODE_ENV === 'development'

    const cleanup = async () => {
      if (server) {
        if (isDebugMode) {
          console.log('\nShutting down MCP server...')
        }
        await server.stop()
        process.exit(0)
      }
    }

    // Handle graceful shutdown
    process.on('SIGINT', cleanup)
    process.on('SIGTERM', cleanup)

    try {
      // Create config with transport options
      const config = new Config(options.kb, options.port ? parseInt(options.port, 10) : undefined)

      if (isDebugMode) {
        console.log('Config created:', {
          kb: options.kb,
          transport: config.transport,
          httpPort: config.httpPort,
        })
      }

      server = new MCPServer(config)
      await server.start()

      if (isDebugMode || config.transport === 'http') {
        console.log(`MCP server started for knowledge base: ${options.kb}`)
        if (config.transport === 'http') {
          console.log(`HTTP transport listening on port ${config.httpPort}`)
        }
      }
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
