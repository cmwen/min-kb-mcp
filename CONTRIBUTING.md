# Contributing to min-kb-mcp

Thank you for your interest in contributing to min-kb-mcp! This document provides guidelines and instructions for contributing to the project.

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for all contributors.

## Getting Started

### Prerequisites

- Node.js 18 or higher
- pnpm 9.0.0 or higher

### Setup

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone git@github.com:YOUR_USERNAME/min-kb-mcp.git
   cd min-kb-mcp
   ```

3. Install dependencies:
   ```bash
   pnpm install
   ```

4. Create a branch for your changes:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development Workflow

### Running the Development Server

```bash
pnpm run dev
```

This starts the server in HTTP mode on port 9876 with debug logging enabled.

### Running Tests

```bash
# Run tests once
pnpm test

# Watch mode for development
pnpm run test:watch
```

### Linting and Formatting

```bash
# Check for linting issues
pnpm run lint

# Fix linting issues automatically
pnpm run lint:fix

# Format code
pnpm run format
```

### Building

```bash
pnpm run build
```

## Commit Guidelines

This project uses [Conventional Commits](https://www.conventionalcommits.org/). Your commit messages should follow this format:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, missing semicolons, etc.)
- `refactor`: Code refactoring without changing functionality
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks, dependency updates, etc.
- `ci`: CI/CD configuration changes

### Examples

```
feat(search): add support for fuzzy matching in search queries

fix(database): prevent database corruption on concurrent writes

docs(readme): update installation instructions for Windows
```

## Pull Request Process

1. Ensure your code passes all tests and linting:
   ```bash
   pnpm run lint
   pnpm test
   pnpm run build
   ```

2. Update documentation if needed:
   - Update README.md for user-facing changes
   - Add/update JSDoc comments for code changes
   - Update CHANGELOG.md following [Keep a Changelog](https://keepachangelog.com/) format

3. Push your changes to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```

4. Create a Pull Request from your fork to the main repository

5. Wait for review and address any feedback

### Pull Request Checklist

- [ ] Code follows the project's style guidelines
- [ ] Tests pass (`pnpm test`)
- [ ] Linting passes (`pnpm run lint`)
- [ ] Build succeeds (`pnpm run build`)
- [ ] Documentation updated (if applicable)
- [ ] CHANGELOG.md updated (for significant changes)
- [ ] Commit messages follow Conventional Commits format

## Testing Guidelines

- Write tests for new features and bug fixes
- Ensure tests are focused and test one thing at a time
- Use descriptive test names that explain what is being tested
- Mock external dependencies when appropriate

## Code Style

This project uses [Biome](https://biomejs.dev/) for linting and formatting. The configuration is in `biome.json`.

Key style points:
- Use TypeScript strict mode
- Use single quotes for strings
- 2 spaces for indentation
- Maximum line length of 100 characters
- Use explicit types where it improves clarity
- Prefer async/await over raw promises

## Architecture

The project is organized as follows:

- `src/cli.ts` - Command-line interface entry point
- `src/server.ts` - MCP server implementation
- `src/core/` - Core functionality (config, file management)
- `src/db/` - Database service and related code
- `src/types/` - TypeScript type definitions

## Questions?

If you have questions about contributing, please:
1. Check existing issues and discussions
2. Create a new issue with your question
3. Reach out to the maintainers

## License

By contributing to this project, you agree that your contributions will be licensed under the MIT License.
