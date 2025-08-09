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

```bash
npm install min-kb-mcp
```

Or run directly with:

```bash
npx min-kb-mcp
```

## Quick Start

1. Start the MCP server for a new knowledge base:
   ```bash
   npx personal-kb-mcp start --kb my-notes
   ```

2. The server will create:
   - A directory for your knowledge base in the standard application support location
   - A SQLite database for indexing
   - An articles directory for markdown files

## Storage Structure

Files are stored in your system's standard application support directory:

- macOS: `~/Library/Application Support/personal-kb-mcp/<kb-name>/`
- Linux: `~/.local/share/personal-kb-mcp/<kb-name>/`
- Windows: `%APPDATA%\\personal-kb-mcp\\<kb-name>\\`

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
   git clone https://github.com/yourusername/personal-kb-mcp.git
   cd personal-kb-mcp
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

- `npm start`: Start the MCP server
- `npm run build`: Build the TypeScript code
- `npm run lint`: Run ESLint
- `npm run format`: Format code with Prettier

## Contributing

Contributions are welcome! Please read our [Contributing Guidelines](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
