# Minimalist Knowledge Base MCP

[![CI](https://github.com/cmwen/min-kb-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/cmwen/min-kb-mcp/actions/workflows/ci.yml)
[![npm version](https://badge.fury.io/js/min-kb-mcp.svg)](https://badge.fury.io/js/min-kb-mcp)

A minimalist, file-based knowledge base server designed to be operated programmatically by Large Language Models (LLMs) and developers. It functions as a headless MCP (Model Context Protocol) server, exposing a suite of tools for managing knowledge.

## Features

- **Multi-Knowledge Base Support**: Manage multiple independent knowledge bases
- **Dual Storage System**:
  - Markdown files as the source of truth
  - SQLite database for efficient indexing and searching
- **Full-Text Search**: Using SQLite FTS5
- **Cross-Platform**: Works on Windows, macOS, and Linux
- **LLM-First Design**: Built specifically for LLM interaction via MCP

## Installation

First, authenticate with GitHub Packages:

```bash
# Create or edit ~/.npmrc
echo "@cmwen:registry=https://npm.pkg.github.com" >> ~/.npmrc
# You'll need a GitHub personal access token with `read:packages` scope
```

Then install the package:

```bash
npm install @cmwen/min-kb-mcp
```

Or run directly with:

```bash
npx @cmwen/min-kb-mcp
```

## Quick Start

1. Start the MCP server for a new knowledge base:

   ```bash
   npx min-kb-mcp start --kb my-notes
   ```

2. The server will create:
   - A directory for your knowledge base in the standard application support location
   - A SQLite database for indexing
   - An articles directory for markdown files

## Storage Structure

Files are stored in your system's standard application support directory:

- macOS: `~/Library/Application Support/min-kb-mcp/<kb-name>/`
- Linux: `~/.local/share/min-kb-mcp/<kb-name>/`
- Windows: `%APPDATA%\\min-kb-mcp\\<kb-name>\\`

Each knowledge base contains:

- `<kb-name>.sqlite`: The SQLite database file
- `articles/`: Directory containing markdown files

## MCP Tools

The following tools are available to LLMs through the MCP server:

- `createArticle`: Create a new article with content and optional keywords
- `getArticle`: Retrieve an article by ID
- `updateArticle`: Update an existing article's content and keywords
- `deleteArticle`: Delete an article
- `searchArticles`: Full-text search with optional time filters
- `findLinkedArticles`: Find articles sharing keywords
- `getArticlesByTimeRange`: Get articles within a time range
- `listArticles`: List all articles
- `getArticleStats`: Get statistics about the knowledge base

## Development

### Prerequisites

- Node.js 18 or higher
- npm or yarn

### Setup

1. Clone the repository:

   ```bash
   git clone git@github.com:cmwen/min-kb-mcp.git
   cd min-kb-mcp
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Run in development mode:
   ```bash
   npm run start -- --kb test-kb
   ```

### Scripts

- `npm start`: Start the MCP server in standard stdio mode
- `npm run dev`: Start the development server with HTTP transport on port 9876
- `npm run build`: Build the TypeScript code
- `npm run lint`: Run ESLint
- `npm run format`: Format code with Prettier

### Development Server

The project supports two transport modes:

1. **Standard Mode (stdio)**:

   ```bash
   npm start -- --kb my-kb
   ```

   This is the default mode, suitable for production use with LLM integrations.

2. **Development Mode (HTTP)**:
   ```bash
   npm run dev
   ```
   This starts a development server that:
   - Uses HTTP transport instead of stdio
   - Runs on port 9876
   - Creates a 'dev-kb' knowledge base
   - Enables CORS for browser clients
   - Supports multiple concurrent connections
   - Provides better debugging capabilities

You can also customize the transport mode and port using environment variables:

```bash
MCP_TRANSPORT=http MCP_PORT=3000 npm start -- --kb my-kb
```

### Using MCP Inspector

When running in development mode, you can use the [MCP Inspector](https://github.com/modelcontextprotocol/inspector) to interact with your server:

1. Start the development server:

   ```bash
   npm run dev
   ```

2. Open MCP Inspector and connect to:
   ```
   http://localhost:9876/mcp
   ```

The inspector allows you to:

- Browse available tools and resources
- Execute tools with different parameters
- View server responses and error messages
- Test server functionality interactively

This is particularly useful for:

- Development and debugging
- Testing new features
- Understanding tool behavior
- Verifying error handling

## Contributing

Contributions are welcome! Please read our [Contributing Guidelines](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
