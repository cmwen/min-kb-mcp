# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.2] - 2025-10-07

### Added

- Created missing `src/index.ts` as main entry point for library usage
- Added `.npmignore` file to control what gets published to npm
- Added comprehensive `CONTRIBUTING.md` with development guidelines
- Added TypeScript declaration files export in package.json

### Fixed

- Fixed duplicate "Found X articles:" message in search results
- Fixed CLI version now reads from package.json instead of hardcoded value
- Fixed server name from "personal-kb" to "min-kb-mcp" for consistency
- Fixed CLI name from "personal-kb-mcp" to "min-kb-mcp" for consistency
- Reduced excessive console.log statements - now only logs in debug mode or HTTP transport

### Changed

- Improved CLI logging behavior - quiet mode for stdio, verbose for debug/http
- Updated server metadata to match current version

## [0.2.1] - 2025-08-21

### Added

- GitHub Actions workflow for publishing to npm on tag push
- Updated README with npm install and publish instructions
- Instructions for setting up npm token and manual publish

### Changed

- README improvements and clarified publishing steps

---

## [0.1.0] - 2025-08-09

### Added

- Initial release of Personal Knowledge Base MCP
- Multi-knowledge base support with `--kb` option
- File-based storage using Markdown files
- SQLite database with FTS5 for indexing and search
- Core MCP tools:
  - createArticle
  - getArticle
  - updateArticle
  - deleteArticle
  - searchArticles
  - findLinkedArticles (structure only)
  - getArticlesByTimeRange (structure only)
  - listArticles (structure only)
  - getArticleStats (structure only)
- Cross-platform path handling using appdata-path
- Basic CLI with start command
- TypeScript configuration and build setup
- ESLint and Prettier configuration
- Basic project documentation
