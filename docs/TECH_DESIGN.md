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

## 5. Development Best Practices & Conventions

To ensure the long-term health, maintainability, and contributor-friendliness of the project, all code should adhere to the following conventions.

### 5.1. Code Style & Formatting

*   **Formatter:** The project will use **Prettier** for automated code formatting. A `.prettierrc` configuration file will be included in the root.
*   **Action:** A `format` script will be added to `package.json` (`prettier --write .`).
*   **Naming Conventions:**
    *   `camelCase` for variables, functions, and object properties.
    *   `PascalCase` for classes, types, and interfaces.
    *   Constants should be `UPPER_SNAKE_CASE`.

### 5.2. Linting

*   **Linter:** **ESLint** will be used with the official TypeScript plugin (`@typescript-eslint/eslint-plugin`).
*   **Configuration:** A base `.eslintrc.js` file will be configured to extend the recommended rules from ESLint and the TypeScript plugin.
*   **Action:** A `lint` script will be added to `package.json` (`eslint . --ext .ts`).

### 5.3. Commit Messages

*   **Specification:** The project will adhere to the **Conventional Commits** specification.
*   **Examples:**
    *   `feat: add keyword-based article linking`
    *   `fix: correct error handling for database writes`
    *   `docs: update TECH_DESIGN with testing strategy`
    *   `chore: configure eslint and prettier`
*   **Benefit:** This allows for automated changelog generation and a clear, navigable Git history.

### 5.4. Error Handling

*   **Custom Errors:** For predictable error scenarios (e.g., an article not being found), custom error classes should be created (e.g., `class ArticleNotFoundError extends Error`).
*   **Propagation:** Service-level modules (`DatabaseService`, `FileManager`) should throw these custom errors. The MCP tool implementations are responsible for catching them and formatting a clear, standardized error message for the LLM.

### 5.5. Testing Strategy (Post-MVP)

*   **Framework:** **Vitest** is recommended for its speed and modern ESM support.
*   **Unit Tests:** Each module's public functions should have corresponding unit tests. Mocks should be used to isolate dependencies (e.g., when testing `DatabaseService`, the `better-sqlite3` dependency should be mocked).
*   **Integration Tests:** Tests will be created for each MCP tool to verify the end-to-end flow across modules (e.g., an `addArticle` test would verify that both the file is created and the database is updated correctly).

### 5.6. Documentation

*   **Code Comments:** Comments should focus on the *why* (the intent or reasoning behind a piece of complex logic), not the *what* (which should be clear from the code itself).
*   **TSDoc:** All public functions, classes, and type definitions must have TSDoc-style comments. This enables auto-generated documentation and provides rich inline help in IDEs.

## 6. Project Setup & Dependencies

*   The `package.json` will be updated to include `uuid` and `remove-markdown`.
*   Type definitions (`@types/uuid`, `@types/remove-markdown`) will be added to `devDependencies`.
*   The `tsconfig.json` remains as previously defined.
