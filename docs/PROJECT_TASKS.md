# Project Implementation Tasks

This document breaks down the development work for the Personal KB MCP into a series of actionable tasks. Each task is designed to be followed by an LLM developer to incrementally build the application based on the established technical design.

---

## Phase 1: Project Setup & Configuration

This phase focuses on establishing the foundational configuration and structure of the project.

### ☐ Task 1: Create Linter & Formatter Configurations

*   **Why:** To enforce consistent code style and catch common errors, as outlined in the technical design. This is crucial for maintainability.
*   **What:**
    1.  Create a `.eslintrc.js` file in the root directory. Configure it to use `eslint:recommended` and `plugin:@typescript-eslint/recommended`.
    2.  Create a `.prettierrc` file in the root directory with some basic rules (e.g., `"semi": false`, `"singleQuote": true`).
*   **Expected Outcome:** The `lint` and `format` scripts in `package.json` should run without errors on an empty codebase.

### ☐ Task 2: Create Core Directory Structure

*   **Why:** To establish the modular architecture defined in the technical design.
*   **What:**
    1.  Create the following directories: `src/api`, `src/cli`, `src/core`, `src/db`.
*   **Expected Outcome:** The `src` directory contains the four specified subdirectories.

### ☐ Task 3: Implement the Configuration Manager

*   **Why:** To create a centralized, reliable way to manage file paths for each knowledge base.
*   **What:**
    1.  Create the file `src/core/config.ts`.
    2.  Implement the `Config` class as specified in `TECH_DESIGN.md`.
    3.  The constructor should take a `kbName` and use `appdata-path` to resolve the root directory.
    4.  It should expose properties for `dbPath` and `articlesPath`.
    5.  It must ensure the directories are created on initialization.
*   **Expected Outcome:** `new Config('test-kb')` successfully creates the necessary directories in the application support folder and provides the correct paths.

---

## Phase 2: Core Service Implementation

This phase involves building the isolated services that handle file and database operations.

### ☐ Task 4: Implement the File Manager

*   **Why:** To abstract all direct filesystem interactions into a single, testable module.
*   **What:**
    1.  Create the file `src/core/file-manager.ts`.
    2.  Implement the functions specified in the tech design: `createArticle`, `readArticle`, `updateArticle`, `deleteArticle`.
    3.  Use the `uuid` package to generate IDs for new articles.
*   **Expected Outcome:** A set of functions that can reliably create, read, update, and delete markdown files in the directory provided by the `Config` object.

### ☐ Task 5: Implement the Database Service

*   **Why:** To manage all SQLite database operations, including schema creation and FTS indexing.
*   **What:**
    1.  Create the file `src/db/database.ts`.
    2.  Implement the `DatabaseService` class.
    3.  The constructor should take the `dbPath` from the `Config` object.
    4.  Implement the `init()` method to create the `articles` and `articles_fts` tables if they don't exist.
    5.  Implement the `indexArticle`, `deindexArticle`, and `search` methods as specified in the tech design. Use `remove-markdown` before inserting content into the FTS table.
*   **Expected Outcome:** A class that can create a database file, set up the schema, and correctly index/search content passed to it.

---

## Phase 3: Application Entrypoint & Server

This phase connects the core services and exposes them to the user and the LLM.

### ☐ Task 6: Implement the CLI Entrypoint

*   **Why:** To create the user-facing command-line tool that starts the server.
*   **What:**
    1.  Create the file `src/cli.ts`.
    2.  Use `commander` to define the `start` command and the required `--kb <name>` option.
    3.  In the command's action handler, create a `Config` instance and pass it to a (not-yet-created) server instance.
*   **Expected Outcome:** Running `tsx src/cli.ts start --kb my-test` executes without errors and correctly initializes the `Config` object.

### ☐ Task 7: Implement the MCP Server & Tools

*   **Why:** This is the core of the application, exposing our backend services to the LLM as a set of tools.
*   **What:**
    1.  Create the file `src/server.ts`.
    2.  Implement the `MCPServer` class.
    3.  The constructor should accept the `Config` object and initialize the `FileManager` and `DatabaseService`.
    4.  Use `@mcp/sdk` to define and register the tools (`addArticle`, `searchArticles`, etc.) as specified in the PRD and tech design.
    5.  Implement the rollback logic described in the tech design for data consistency.
*   **Expected Outcome:** A running MCP server that correctly exposes the defined tools. Invoking a tool (e.g., `addArticle`) correctly calls the file and database services and performs the complete operation.

---

## Phase 4: Verification

This final phase is for ensuring the completed application works as expected.

### ☐ Task 8: Manual End-to-End Test

*   **Why:** To confirm all components work together correctly in a real-world scenario.
*   **What:**
    1.  Run the `start` command.
    2.  Use an MCP client (or a simple test script) to call each registered tool one by one.
    3.  Verify that files are created in the correct directory.
    4.  Verify that the SQLite database is populated correctly.
    5.  Verify that search results are accurate.
    6.  Verify that `delete` operations clean up both the file and the database index.
*   **Expected Outcome:** The application functions correctly and reliably according to the product requirements.
