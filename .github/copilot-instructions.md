# Copilot instructions for this repo

Purpose: This is an LLM-first MCP server that manages a file-based knowledge base with a SQLite (WASM via sql.js) index. The CLI starts the server; MCP tools read/write Markdown files and keep the index in sync.

Key modules (read these first)
- src/cli.ts: Commander CLI entry. start --kb <name> is required. Transport is stdio (default) or HTTP when MCP_TRANSPORT=http. CLI can accept --port; MCP_PORT overrides too.
- src/server.ts: MCPServer wiring (stdio or Streamable HTTP transport), Express-based /mcp endpoint for HTTP, tool and resource registration. Uses zod schemas for tool inputs. Maintains session via mcp-session-id header for HTTP.
- src/core/config.ts: Resolves KB paths with appdata-path. KB root: <appdata>/min-kb-mcp/<kb> with <kb>.sqlite and articles/; ensures directories exist.
- src/core/file-manager.ts: Creates/reads/updates/deletes Markdown files under articles/. IDs are uuid v4; filenames are <id>.md. Throws FileOperationError.
- src/db/database.ts: sql.js (WASM) database. Tables: articles(id, filePath, title, keywords) and articles_content(id, content). Tries FTS5 (porter tokenizer, fallback variants) then falls back to LIKE search when FTS5 is unavailable. Throws DatabaseError.

Data flow & responsibilities
- create/update/delete: FileManager writes files; DatabaseService indexArticle/deindexArticle keeps tables+FTS in sync then persists DB to disk.
- search: Prefer FTS5 with bm25(...) ordering; fallback returns rank=0 and simple LIKE matches.
- resources: Articles exposed via article://{id}; resource handler reads the Markdown file from articles/.

Tool implementation pattern (follow this shape)
- Define input schema with zod and register via server.registerTool.
- Perform file op(s) via FileManager, then index via DatabaseService.
- Return MCP content: include a minimal text message and a resource entry like { type: 'resource', uri: 'article://<id>', resource: { text, uri, mimeType: 'text/markdown' } }.
- On failure, return { content: [{ type: 'text', text: msg }], isError: true } (see createArticle/updateArticle/deleteArticle). Keep responses short.

HTTP transport specifics
- Express routes: POST /mcp handles requests; GET/DELETE /mcp handle session notifications/termination. Multiple sessions tracked by sessionId; client supplies mcp-session-id header.
- CORS is permissive for dev (origin: '*'). Lock down in production.

Developer workflows
- Install: pnpm i
- Lint/format: pnpm run lint, pnpm run format (Biome)
- Build: pnpm run build (tsc to dist/). Tests are excluded from build (see tsconfig exclude).
- Tests: pnpm test (Vitest; src/**/*.spec.ts). Example: src/db/database.spec.ts bootstraps the DB by indexing once to await async init.
- Run (stdio MCP): pnpm start -- --kb my-kb
- Run (HTTP dev): MCP_TRANSPORT=http MCP_PORT=9876 pnpm run dev, then connect MCP Inspector to http://localhost:9876/mcp

Conventions & gotchas
- TypeScript strict mode; Node ≥22. Errors use FileOperationError/DatabaseError. Avoid leaking low-level errors in tool responses; use isError with succinct text.
- IDs are UUIDs; filenames are <id>.md; title is derived from first H1 if not provided (DatabaseService.extractTitle).
- sql.js FTS5 support may be absent in some WASM builds; code transparently falls back to LIKE. Ranking may be 0 and order less meaningful in fallback.
- Publishing targets GitHub Packages (publishConfig.registry). prepublishOnly runs build; CLI bin is dist/cli.js.

Add new features by mirroring existing patterns
- New tool: add zod schema, use FileManager/DatabaseService, return a resource when appropriate, and register in server.registerTools().
- New resource: extend registerResources() with a ResourceTemplate and read via FileManager.

Reference examples
- createArticle/searchArticles/updateArticle/deleteArticle in src/server.ts show the canonical tool structure and error handling.
- DatabaseService.indexArticle/search/listArticles in src/db/database.ts show schema, FTS/LIKE dual-path search, and persistence.
