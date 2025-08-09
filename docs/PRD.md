# Product Requirements Document: Personal Knowledge Base MCP

## 1. Introduction & Vision

This document outlines the requirements for the Personal Knowledge Base (KB) MCP (Minimum Credible Product). The project is an open-source, lightweight, and extensible knowledge base designed to be operated programmatically by Large Language Models (LLMs) and developers.

It functions as a headless **MCP (Model Context Protocol) server**, exposing a suite of tools for managing knowledge. This approach moves beyond a traditional REST API to a more direct, function-based interaction model tailored for AI agents.

The primary goal is to create a simple, robust, and well-documented tool that allows for powerful, local knowledge management within LLM-powered workflows.

## 2. Target Audience

- **Primary:** Large Language Models (LLMs) interacting via the Model Context Protocol.
- **Secondary:** Developers and users who want to manage a local knowledge base of Markdown files and make it accessible to AI.

## 3. Core Features (MVP)

### 3.1. Command-Line Interface (CLI)

- The tool will be executable via `npx personal-kb-mcp`.
- The CLI's primary role is to start the MCP server for a specified knowledge base.

### 3.2. Multi-Knowledge Base Support

- The server will support managing multiple, independent knowledge bases.
- The user must specify which KB to operate on using a mandatory CLI option: `--kb <knowledge-base-name>`.

### 3.3. Dual Storage System

- **Filesystem (Source of Truth):** Articles are stored as individual Markdown (`.md`) files in a dedicated directory for each KB. This allows users to easily view, edit, and manage their content with standard text editors.
- **SQLite Database (Index):** Each KB has a corresponding SQLite database that acts as an index over the Markdown files. The database stores metadata and a full-text search index of the content.

### 3.4. Cross-Platform Data Storage

- Each knowledge base will have its own root directory within the standard application support path.
- This directory will contain both the SQLite file and the `articles` subdirectory for the `.md` files.
- Example Path (macOS): `~/Library/Application Support/personal-kb-mcp/my-notes/`
  - `~/Library/Application Support/personal-kb-mcp/my-notes/my-notes.sqlite`
  - `~/Library/Application Support/personal-kb-mcp/my-notes/articles/`

### 3.5. MCP Server & Tools

- The core functionality is exposed via a local MCP server.
- The server provides a set of invokable tools for knowledge management.

### 3.6. Knowledge Linking

- Articles can be linked via shared keywords. The server will provide a tool to find articles related by their keywords.

## 4. Data & Schema

### 4.1. Filesystem

- Each article is a separate `.md` file.
- The filename will be the article's unique ID (e.g., `<uuid>.md`).

### 4.2. SQLite Schema

- `id` (TEXT, PRIMARY KEY): The unique ID of the article (matches the filename).
- `filePath` (TEXT): The absolute path to the corresponding `.md` file.
- `title` (TEXT): The title of the article (e.g., the first H1 heading).
- `keywords` (TEXT): A comma-separated list of strings for tagging and linking.
- `created_at` (INTEGER): Unix timestamp of when the article was created.
- `modified_at` (INTEGER): Unix timestamp of when the article was last modified.
- An FTS5 virtual table will be created for full-text search on content and title.

## 5. MCP Tool Definitions (The API)

The MCP server will register and expose the following tools:

- `createArticle(content: string, keywords?: string[])`: Creates a new article. Saves the content to a new `.md` file and indexes it in the database. Returns the new article's `id` and `filePath`.
- `getArticle(id: string)`: Retrieves the full content of an article by reading its `.md` file.
- `updateArticle(id: string, content: string, keywords?: string[])`: Updates the content of an existing `.md` file and re-indexes it in the database.
- `deleteArticle(id: string)`: Deletes an article's `.md` file and removes its entry from the database index.
- `searchArticles(query: string, timeRange?: {start?: string, end?: string}, timeField?: "created"|"modified")`: Performs a full-text search with optional time filters. Returns up to 10 matching articles with relevance scores.
- `findLinkedArticles(id: string)`: Finds and returns a list of articles that share one or more keywords with the specified article.
- `getArticlesByTimeRange(startTime?: string, endTime?: string, type: "created"|"modified")`: Retrieves articles within a specific time range based on creation or modification time.
- `listArticles()`: Lists all articles in the knowledge base with their basic metadata.
- `getArticleStats(timeRange?: {start?: string, end?: string})`: Returns statistics about articles including creation/modification counts and keyword frequencies.

## 6. Future Enhancements (Post-MVP)

- **Consistency Tool:** A CLI command to re-scan the filesystem and re-index the database to ensure consistency if files are manually changed.
- **Vector/Semantic Search:** Integrate vector embeddings for more advanced similarity search.
- **Explicit Linking:** Support for `[[wiki-link]]` style links within the markdown content.

## 7. Technology Stack

- **Language:** TypeScript
- **Server Protocol:** Model Context Protocol (MCP)
- **MCP SDK:** `@mcp/sdk`
- **Database:** SQLite with FTS5
- **Database Driver:** `better-sqlite3`
- **CLI Builder:** `commander`
- **Path Utility:** `appdata-path`
- **TS Runner:** `tsx`
