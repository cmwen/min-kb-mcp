# Technical Design: Personal Knowledge Base MCP

## 1. Overview

This document provides a detailed technical design for the Personal Knowledge Base (KB) MCP server. It is based on the specifications outlined in the `PRD.md`. The design prioritizes a clean separation of concerns, robustness, and extensibility.

The architecture is composed of several core modules that work together to provide the MCP server's functionality: a CLI entry point, a configuration manager, a file manager, a database indexer, and the MCP server itself.

## 2. Core Components & Responsibilities

### 2.1. CLI (`src/cli.ts`)

- **Library:** `commander`
- **Responsibility:**
  - Acts as the main entry point for the application.
  - Defines the main command (`start`) and the global, mandatory option `--kb <name>`.
  - Initializes the `Config` object with the provided KB name.
  - Instantiates and starts the `MCPServer`, passing the `Config` object to it.
  - Handles CLI-level errors, such as the `--kb` option being missing.

### 2.2. Configuration Manager (`src/core/config.ts`)

- **Libraries:** `appdata-path`, Node.js `path`
- **Responsibility:**
  - A `Config` class will be the central point for all path-related information.
  - The constructor takes the `kbName`.
  - It resolves and exposes all necessary paths:
    - `kbRootPath`: The root directory for the KB.
    - `dbPath`: The full path to the `<kbName>.sqlite` file.
    - `articlesPath`: The full path to the `articles` subdirectory.
  - On initialization, it will use `fs.mkdirSync(path, { recursive: true })` to ensure all these directories exist.

### 2.3. File Manager (`src/core/file-manager.ts`)

- **Libraries:** Node.js `fs/promises`, `uuid`
- **Responsibility:**
  - Handles all direct interactions with the filesystem.
  - `createArticle(content)`: Generates a v4 UUID for the ID, saves the content to `<articlesPath>/<id>.md`, and returns the `id` and `filePath`.
  - `readArticle(filePath)`: Reads and returns the content of a given file.
  - `updateArticle(filePath, newContent)`: Writes new content to an existing file.
  - `deleteArticle(filePath)`: Deletes a file.

### 2.4. Database Service (`src/db/database.ts`)

- **Libraries:** `better-sqlite3`, `remove-markdown`
- **Responsibility:**
  - Manages all database interactions.
  - **Schema:**
    - `articles`: `id TEXT PRIMARY KEY, filePath TEXT NOT NULL, title TEXT, keywords TEXT`
    - `articles_fts`: `CREATE VIRTUAL TABLE articles_fts USING fts5(id UNINDEXED, content, tokenize = 'porter');` (Note: `id` is `UNINDEXED` because we will join on the main `articles` table).
  - `init()`: Connects to the database and runs `CREATE TABLE IF NOT EXISTS...` for both tables to ensure the schema is ready.
  - `indexArticle(article)`: Inserts/updates records. It will use `remove-markdown` to get clean text for the `ftsContent` field. It will also extract the first H1 heading for the `title`.
  - `deindexArticle(id)`: Removes an article from the index.
  - `search(query)`: Executes an FTS query against the `articles_fts` table.

### 2.5. MCP Server (`src/server.ts`)

- **Library:** `@modelcontextprotocol/sdk`
- **Responsibility:**
  - Initializes the MCP server using the SDK's `McpServer` class.
  - Defines and registers tools, resources, and prompts available to the LLM.
  - Each tool implementation will coordinate calls between the `FileManager` and `DatabaseService`.
  - Implements proper error handling and response formatting according to the MCP protocol.
  - Uses the SDK's validation capabilities with Zod schemas for tool inputs.
  - Handles session management and transport configuration (stdio for CLI usage).

## 3. MCP Implementation Details

### 3.1. Server Configuration

The MCP server will be configured using the SDK's `McpServer` class:

```typescript
const server = new McpServer({
  name: 'personal-kb',
  version: '1.0.0',
})
```

### 3.2. Tool Definitions

Tools will be registered using the SDK's `registerTool` method and Zod for input validation:

```typescript
server.registerTool(
  'addArticle',
  {
    title: 'Add Article',
    description: 'Add a new article to the knowledge base',
    inputSchema: {
      content: z.string().describe('The markdown content of the article'),
      title: z.string().optional().describe('Optional title for the article'),
    },
  },
  async ({ content, title }) => {
    try {
      const { id, filePath } = await fileManager.createArticle(content)
      await dbService.indexArticle({ id, filePath, content, title })
      return {
        content: [
          {
            type: 'text',
            text: `Article created successfully with ID: ${id}`,
          },
        ],
      }
    } catch (error) {
      // Proper error handling with rollback
      await fileManager.deleteArticle(filePath)
      return {
        content: [
          {
            type: 'text',
            text: `Error creating article: ${error.message}`,
          },
        ],
        isError: true,
      }
    }
  }
)
```

### 3.3. Resource Definitions

The server will expose articles as resources using dynamic templates:

```typescript
server.registerResource(
  'article',
  new ResourceTemplate('article://{id}', { list: undefined }),
  {
    title: 'Article Resource',
    description: 'Access to individual articles in the knowledge base',
  },
  async (uri, { id }) => {
    try {
      const article = await fileManager.readArticle(id)
      return {
        contents: [
          {
            uri: uri.href,
            text: article.content,
            mimeType: 'text/markdown',
          },
        ],
      }
    } catch (error) {
      throw new Error(`Article not found: ${error.message}`)
    }
  }
)
```

### 3.4. Transport Configuration

For CLI usage, the server will use the SDK's stdio transport:

```typescript
const transport = new StdioServerTransport()
await server.connect(transport)
```

### 3.5. Data Flow & Transactionality

To ensure data consistency, tool implementations follow the SDK's response format and error handling patterns:

1. Input validation using Zod schemas
2. Coordinated operations between FileManager and DatabaseService
3. Proper response formatting using the SDK's types
4. Error handling with rollback mechanisms where needed

Each tool will follow this pattern to maintain data consistency and provide clear feedback to the LLM.

## 5. Development Best Practices & Conventions

To ensure the long-term health, maintainability, and contributor-friendliness of the project, all code should adhere to the following conventions.

### 5.1. Code Style & Formatting

- **Formatter:** The project will use **Prettier** for automated code formatting. A `.prettierrc` configuration file will be included in the root.
- **Action:** A `format` script will be added to `package.json` (`prettier --write .`).
- **Naming Conventions:**
  - `camelCase` for variables, functions, and object properties.
  - `PascalCase` for classes, types, and interfaces.
  - Constants should be `UPPER_SNAKE_CASE`.

### 5.2. Linting

- **Linter:** **ESLint** will be used with the official TypeScript plugin (`@typescript-eslint/eslint-plugin`).
- **Configuration:** A base `.eslintrc.js` file will be configured to extend the recommended rules from ESLint and the TypeScript plugin.
- **Action:** A `lint` script will be added to `package.json` (`eslint . --ext .ts`).

### 5.3. Commit Messages

- **Specification:** The project will adhere to the **Conventional Commits** specification.
- **Examples:**
  - `feat: add keyword-based article linking`
  - `fix: correct error handling for database writes`
  - `docs: update TECH_DESIGN with testing strategy`
  - `chore: configure eslint and prettier`
- **Benefit:** This allows for automated changelog generation and a clear, navigable Git history.

### 5.4. Error Handling

- **Custom Errors:** For predictable error scenarios (e.g., an article not being found), custom error classes should be created (e.g., `class ArticleNotFoundError extends Error`).
- **Propagation:** Service-level modules (`DatabaseService`, `FileManager`) should throw these custom errors. The MCP tool implementations are responsible for catching them and formatting a clear, standardized error message for the LLM.

### 5.5. Testing Strategy (Post-MVP)

- **Framework:** **Vitest** is recommended for its speed and modern ESM support.
- **Unit Tests:** Each module's public functions should have corresponding unit tests. Mocks should be used to isolate dependencies (e.g., when testing `DatabaseService`, the `better-sqlite3` dependency should be mocked).
- **Integration Tests:** Tests will be created for each MCP tool to verify the end-to-end flow across modules (e.g., an `addArticle` test would verify that both the file is created and the database is updated correctly).

### 5.6. Documentation

- **Code Comments:** Comments should focus on the _why_ (the intent or reasoning behind a piece of complex logic), not the _what_ (which should be clear from the code itself).
- **TSDoc:** All public functions, classes, and type definitions must have TSDoc-style comments. This enables auto-generated documentation and provides rich inline help in IDEs.

## 6. Project Setup & Dependencies

- The `package.json` will be updated to include `uuid` and `remove-markdown`.
- Type definitions (`@types/uuid`, `@types/remove-markdown`) will be added to `devDependencies`.
- The `tsconfig.json` remains as previously defined.
