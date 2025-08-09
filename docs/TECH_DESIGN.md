# Technical Design: Personal Knowledge Base MCP

## 1. Overview

This document provides a detailed technical design for the Personal Knowledge Base (KB) MCP server. It is based on the specifications outlined in the `PRD.md`. The design prioritizes a clean separation of concerns, robustness, and extensibility.

The architecture is composed of several core modules that work together to provide the MCP server's functionality: a CLI entry point, a configuration manager, a file manager, a database indexer, and the MCP server itself.

## 2. Core Components & Responsibilities

### 2.1. CLI (`src/cli.ts`)

*   **Library:** `commander`
*   **Responsibility:**
    *   Acts as the main entry point for the application.
    *   Defines the main command (`start`) and the global, mandatory option `--kb <name>`.
    *   Initializes the `Config` object with the provided KB name.
    *   Instantiates and starts the `MCPServer`, passing the `Config` object to it.
    *   Handles CLI-level errors, such as the `--kb` option being missing.

### 2.2. Configuration Manager (`src/core/config.ts`)

*   **Libraries:** `appdata-path`, Node.js `path`
*   **Responsibility:**
    *   A `Config` class will be the central point for all path-related information.
    *   The constructor takes the `kbName`.
    *   It resolves and exposes all necessary paths:
        *   `kbRootPath`: The root directory for the KB.
        *   `dbPath`: The full path to the `<kbName>.sqlite` file.
        *   `articlesPath`: The full path to the `articles` subdirectory.
    *   On initialization, it will use `fs.mkdirSync(path, { recursive: true })` to ensure all these directories exist.

### 2.3. File Manager (`src/core/file-manager.ts`)

*   **Libraries:** Node.js `fs/promises`, `uuid`
*   **Responsibility:**
    *   Handles all direct interactions with the filesystem.
    *   `createArticle(content)`: Generates a v4 UUID for the ID, saves the content to `<articlesPath>/<id>.md`, tracks creation time, and returns the `id` and `filePath`.
    *   `readArticle(filePath)`: Reads and returns the content of a given file.
    *   `updateArticle(filePath, newContent)`: Writes new content to an existing file and updates the modification time.
    *   `deleteArticle(filePath)`: Deletes a file.
    *   `getFileStats(filePath)`: Returns file creation and modification times using `fs.statSync`.

### 2.4. Database Service (`src/db/database.ts`)

*   **Libraries:** `better-sqlite3`, `remove-markdown`
*   **Responsibility:**
    *   Manages all database interactions.
    *   **Schema:**
        *   `articles`: `id TEXT PRIMARY KEY, filePath TEXT NOT NULL, title TEXT, keywords TEXT, created_at INTEGER NOT NULL, modified_at INTEGER NOT NULL`
        *   `articles_fts`: `CREATE VIRTUAL TABLE articles_fts USING fts5(id UNINDEXED, content, title, tokenize = 'porter unicode61');`
    *   `init()`: Connects to the database and runs `CREATE TABLE IF NOT EXISTS...` for both tables to ensure the schema is ready.
    *   `indexArticle(article)`: Inserts/updates records with timestamps. Uses `remove-markdown` for clean text and extracts the first H1 heading for the title.
    *   `deindexArticle(id)`: Removes an article from both tables.
    *   `search(query, timeRange?, timeField?)`: Executes an FTS query with optional time filters. Limited to 10 results, ordered by relevance score.
    *   `getByTimeRange(startTime?, endTime?, type)`: Retrieves articles within a specified time range.
    *   `getStats(timeRange?)`: Returns article statistics including creation/modification counts and keyword frequencies.

### 2.5. MCP Server (`src/server.ts`)

*   **Library:** `@mcp/sdk`
*   **Responsibility:**
    *   Initializes the MCP server.
    *   Defines the toolset available to the LLM.
    *   Each tool implementation will coordinate calls between the `FileManager` and `DatabaseService`.

## 3. Data Flow & Error Handling

Since this is a single-user local system, we focus on clear error reporting rather than complex transaction management.

**Example: `createArticle` Flow**

1.  The `createArticle` tool is invoked.
2.  Call `FileManager.createArticle(content)`. This:
    - Generates a UUID
    - Creates the `.md` file
    - Records creation timestamp
3.  If file creation fails, return error to MCP with clear message.
4.  Call `DatabaseService.indexArticle(...)` with file data and timestamps.
5.  If indexing fails:
    - Delete the created file
    - Return error to MCP with clear message
6.  On success, return `id` and `filePath`.

Similar error handling applies to `updateArticle` and `deleteArticle`. All errors are propagated to the MCP layer with clear messages for the LLM to explain to users.

## 4. Project Setup & Dependencies

*   The `package.json` will be updated to include `uuid` and `remove-markdown`.
*   Type definitions (`@types/uuid`, `@types/remove-markdown`) will be added to `devDependencies`.
*   The `tsconfig.json` remains as previously defined.
