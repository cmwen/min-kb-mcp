#!/usr/bin/env node
import { Command } from 'commander'
import { Config } from './core/config'
import { MCPServer } from './server'

const program = new Command()

program
  .name('personal-kb-mcp')
  .description('Personal Knowledge Base MCP Server')
  .version('0.1.0')

program
  .command('start')
  .description('Start the MCP server')
  .requiredOption('--kb <name>', 'Name of the knowledge base')
  .action(async (options) => {
    try {
      const config = new Config(options.kb)
      const server = new MCPServer(config)
      await server.start()
      console.log(`MCP server started for knowledge base: ${options.kb}`)
    } catch (error) {
      console.error('Failed to start server:', error instanceof Error ? error.message : String(error))
      process.exit(1)
    }
  })

program.parse()
