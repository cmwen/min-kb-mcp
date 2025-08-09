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
    *   `createArticle(content)`: Generates a v4 UUID for the ID, saves the content to `<articlesPath>/<id>.md`, and returns the `id` and `filePath`.
    *   `readArticle(filePath)`: Reads and returns the content of a given file.
    *   `updateArticle(filePath, newContent)`: Writes new content to an existing file.
    *   `deleteArticle(filePath)`: Deletes a file.

### 2.4. Database Service (`src/db/database.ts`)

*   **Libraries:** `better-sqlite3`, `remove-markdown`
*   **Responsibility:**
    *   Manages all database interactions.
    *   **Schema:**
        *   `articles`: `id TEXT PRIMARY KEY, filePath TEXT NOT NULL, title TEXT, keywords TEXT`
        *   `articles_fts`: `CREATE VIRTUAL TABLE articles_fts USING fts5(id UNINDEXED, content, tokenize = 'porter');` (Note: `id` is `UNINDEXED` because we will join on the main `articles` table).
    *   `init()`: Connects to the database and runs `CREATE TABLE IF NOT EXISTS...` for both tables to ensure the schema is ready.
    *   `indexArticle(article)`: Inserts/updates records. It will use `remove-markdown` to get clean text for the `ftsContent` field. It will also extract the first H1 heading for the `title`.
    *   `deindexArticle(id)`: Removes an article from the index.
    *   `search(query)`: Executes an FTS query against the `articles_fts` table.

### 2.5. MCP Server (`src/server.ts`)

*   **Library:** `@mcp/sdk`
*   **Responsibility:**
    *   Initializes the MCP server.
    *   Defines the toolset available to the LLM.
    *   Each tool implementation will coordinate calls between the `FileManager` and `DatabaseService`.

## 3. Data Flow & Transactionality

To ensure data consistency, tool implementations will follow a specific order of operations with error handling.

**Example: `addArticle` Flow**

1.  The `addArticle` tool is invoked.
2.  Call `FileManager.createArticle(content)`. This writes the `.md` file.
3.  **If successful:** Proceed to step 4.
4.  **If it fails:** The operation fails, and an error is returned to the LLM. The system is in a clean state.
5.  Call `DatabaseService.indexArticle(...)` with the new file's data.
6.  **If successful:** The operation is complete. Return the `id` and `filePath`.
7.  **If it fails:** The system is in an inconsistent state (orphaned file). The `addArticle` tool's `catch` block will immediately call `FileManager.deleteArticle(filePath)` to roll back the file creation. Then, an error is returned to the LLM.

This same `try/catch` rollback logic will be applied to `updateArticle` and `deleteArticle` to handle potential inconsistencies.

## 4. Project Setup & Dependencies

*   The `package.json` will be updated to include `uuid` and `remove-markdown`.
*   Type definitions (`@types/uuid`, `@types/remove-markdown`) will be added to `devDependencies`.
*   The `tsconfig.json` remains as previously defined.
