# AI Agent Guidelines for SAP UX Tools

This document provides essential guidelines for AI-powered tools working with the SAP UX Tools monorepo. Following these guidelines ensures code quality, maintainability, and consistency across the project.

## Table of Contents

- [Overview](#overview)
- [Critical Requirements](#critical-requirements)
- [Quality Gates](#quality-gates)
- [Development Standards](#development-standards)
- [Package Management](#package-management)
- [Testing Requirements](#testing-requirements)
- [Security and Maintenance](#security-and-maintenance)
- [Change Management](#change-management)
- [Useful Commands](#useful-commands)

## Overview

The SAP UX Tools is a monorepo for building SAP Fiori applications. All packages of this monorepo can be found in the `/packages` folder. The project uses:

- **Package Manager**: pnpm (see root [package.json](package.json) for required version)
- **Node Version**: >=20.x (see root [package.json](package.json) engines field)
- **Build System**: Nx for orchestration
- **Testing**: Jest for unit tests, Playwright for integration tests
- **Versioning**: Changesets for automated version management
- **Publishing**: Automated via GitHub Actions to npmjs.com

## Critical Requirements

### 0. All Quality Gates Must Pass

Before submitting any changes, ensure all the following commands complete successfully:

```bash
pnpm install
pnpm build
pnpm lint
pnpm test
```

**IMPORTANT**: All four commands must pass without errors. This is non-negotiable for all contributions.

### 1. Package Version Alignment

All packages across the pnpm workspace must use **the same version** of shared dependencies. This ensures consistency and prevents version conflicts.

**Check version alignment:**
```bash
pnpm lint:dependency-versions
```

This uses `check-dependency-version-consistency` to validate that all packages use identical versions of shared dependencies.

**Common shared dependencies to align:**
- TypeScript
- Jest and testing utilities
- ESLint and related plugins
- Build tools (esbuild, rimraf, etc.)
- UI libraries (React, React-DOM)

**Rule**: When updating a dependency in one package, update it in ALL packages that use it.

### 2. Dependency Version Freshness

Dependencies should **not be older than 6 months** to ensure security, bug fixes, and compatibility with the ecosystem.

**Guidelines:**
- Regularly review and update dependencies
- Check npm registry for latest stable versions
- Review changelogs for breaking changes before upgrading
- Test thoroughly after version bumps
- Use `pnpm overrides` (in root package.json) for security patches when necessary

**Check dependency ages:**
```bash
# Check outdated dependencies
pnpm outdated

# Check specific package
pnpm outdated --filter @sap-ux/[package-name]
```

### 3. Code Coverage Standards

**Minimum code coverage: 80% for all code changes and packages**

**Requirements:**
- All new code must include comprehensive tests
- Modified code must maintain or improve existing coverage
- Coverage is measured on the `src/**/*.ts` files
- Both unit tests and integration tests contribute to coverage

**Check coverage:**
```bash
# Run tests with coverage
pnpm test

# View coverage reports
# Coverage reports are in: packages/[package-name]/coverage/lcov-report/index.html
```

**Coverage Configuration** (from [jest.base.js](jest.base.js:6)):
- `collectCoverageFrom: ['src/**/*.ts']`
- Reports: text and lcov formats
- SonarCloud integration via jest-sonar reporter

### 4. Lint Error Resolution

**All lint errors must be fixed before committing code.**

**Run linting:**
```bash
# Check for lint errors
pnpm lint

# Auto-fix lint issues
pnpm lint:fix
```

**Linting covers:**
- TypeScript code style (ESLint with typescript-eslint)
- Code formatting (Prettier integration)
- Import ordering and resolution
- JSDoc documentation requirements
- Promise handling best practices
- Security patterns (via eslint-plugin-sonarjs)

**Configuration:**
- Root config: [eslint.config.js](eslint.config.js)
- Prettier config: [.prettierrc.js](.prettierrc.js)

### 5. Security Audit Resolution

**pnpm audit issues should be resolved promptly.**

**Check for vulnerabilities:**
```bash
pnpm audit
```

**Resolution strategies:**
1. **Update vulnerable packages** to patched versions
2. **Use pnpm overrides** for transitive dependencies (see root package.json)
3. **Document exceptions** if updates break functionality
4. **Prioritize high and critical vulnerabilities**

**Existing overrides** (from [package.json](package.json:80-90)):
- axios, esbuild, fast-xml-parser, lodash, tar (security patches)
- Review and update these regularly

### 7. Modern TypeScript

**All code should be written in modern TypeScript.**

**Standards:**
- TypeScript 5.9.3+ (current version in repo)
- Target: ES2023
- Strict mode enabled
- Use ES modules (import/export)
- Prefer `const` over `let`
- Use async/await over raw Promises
- Leverage TypeScript features: generics, union types, type guards, etc.
- Avoid `any` type - use `unknown` or proper types
- **Avoid TypeScript enums** - prefer union types or const objects for better type safety and tree-shaking

**TypeScript config** (from [tsconfig.json](tsconfig.json)):
- Strict mode enabled
- Composite projects for incremental builds
- Project references for monorepo structure

### 8. Package Naming and Scoping

**Package naming rules:**

1. **All packages must include `@sap-ux` scope** UNLESS:
   - It is a VSCode extension (e.g., `sap-ux-sap-systems-ext`)
   - It is marked  as publisher  = "SAPOSS",

2. **Folder structure:**
   - Package folders: `packages/[name]`
   - Folder name = package name without `@sap-ux/` prefix
   - Example: `@sap-ux/fiori-freestyle-writer` → `packages/fiori-freestyle-writer`

3. **Extension naming:**
   - Pattern: `sap-ux-[name]-ext`
   - Examples: `sap-ux-application-modeler-ext`, `sap-ux-sap-systems-ext`

4. **Private packages:**
   - Packages intended for internal use only (e.g., test utilities, integration tests) must have `"private": true` in package.json
   - Private packages are NOT published to npm
   - Use `@sap-ux-private/` scope for private packages
   - Example: `@sap-ux-private/adaptation-editor-tests`
   - **Default**: All packages are public unless explicitly marked private - only add `"private": true` when the package should not be published

### 9. Changeset Requirements

**All changes to source code or runtime dependencies require a changeset.**

**When to create a changeset:**
- ✅ Any changes to files in `src/` directory
- ✅ Adding, removing, or updating dependencies (not devDependencies)
- ✅ Changes to templates or runtime assets
- ✅ Bug fixes
- ✅ New features
- ✅ Breaking changes
- ✅ Changes to README.md

**When NOT to create a changeset:**
- ❌ Changes only to tests (test files in `test/` directories)
- ❌ Changes only to devDependencies (unless the package uses esbuild for bundling, as bundled devDependencies affect runtime)
- ❌ Configuration changes (eslint, prettier, jest configs)
- ❌ CI/CD pipeline updates (.github/workflows)

**Create a changeset:**
```bash
pnpm cset
# or
pnpm changeset
```

**Changeset workflow:**
1. Interactive CLI prompts for:
   - Which packages changed
   - Version bump type (major/minor/patch)
   - Summary of changes
2. Creates a markdown file in `.changeset/` directory
3. Commit the changeset file with your changes
4. CI validates changesets before merge
5. After merge to main, versions are automatically bumped and published

**Validation:**
The build process includes `pnpm validate:changesets` to check:
- Changesets have valid frontmatter
- No blocked major version bumps (see [scripts/validate-changesets.js](scripts/validate-changesets.js))

## Quality Gates

The CI/CD pipeline enforces these quality gates on all pull requests:

1. **Build**: All packages must build successfully
2. **Lint**: Code must pass ESLint checks (on forks)
3. **Unit Tests**: All unit tests must pass
4. **Integration Tests**: All Playwright tests must pass
5. **Changeset Validation**: Valid changesets if source code changed
6. **SonarCloud**: Code quality and security scanning

**CI Configuration**: [.github/workflows/pipeline.yml](.github/workflows/pipeline.yml)

**Matrix testing:**
- OS: Ubuntu, Windows, macOS
- Node: 20.x, 22.x
- Timeout: 45 minutes

## Development Standards

### Code Style

Follow the conventions in [docs/Guidelines.md](docs/Guidelines.md):

**TypeScript:**
- Use ESLint and Prettier for consistent formatting
- See [eslint.config.js](eslint.config.js) for linting rules
- See [.prettierrc.js](.prettierrc.js) for formatting rules
- Individual packages may have their own eslint configs that extend the root configuration

**Testing:**
- Use given/when/then pattern
- Test behavior, not implementation
- Test public interfaces with all possible inputs
- Use Jest snapshots for file generation validation
- **Cross-platform snapshots**: Snapshots must never contain file or folder paths with `/` or `\` to ensure tests run consistently across Linux, Mac, and Windows
- Mock dependencies appropriately
- Keep test scope focused

**Git Commits:**
- Follow [Conventional Commits](https://conventionalcommits.org)
- Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `revert`, `WIP`
- Max 100 characters for commit message
- Use imperative mood: "Add feature" not "Added feature"

### Code Reusability and Common Libraries

**Always reuse existing functions from common libraries before implementing new ones.**

**Common reusable libraries in this monorepo:**
- `@sap-ux/project-access` - Project file system operations and Fiori project utilities
- `@sap-ux/axios-extension` - Enhanced HTTP client with middleware support
- `@sap-ux/logger` - Logging utilities and message handling
- `@sap-ux/ui5-config` - UI5 configuration management
- `@sap-ux/store` - Secure storage and credentials management
- `@sap-ux/btp-utils` - SAP BTP platform utilities
- And others in `/packages` folder

**Guidelines:**

1. **Search before implementing**: Before creating a new utility function, search existing common libraries to see if the functionality already exists
   ```bash
   # Search for existing functionality
   pnpm --filter @sap-ux/project-access exec -- echo "Check package API"
   # Or use grep to search for similar functions
   ```

2. **Refactor to common libraries**: When you find duplicate code across multiple packages:
   - Identify the appropriate existing common library to extend
   - Or create a new common library if the functionality doesn't fit existing ones
   - Move the common function to the shared library
   - Update all packages to use the shared implementation
   - Ensure proper testing of the refactored code

3. **Avoid circular dependencies**: When moving code to common libraries:
   - Check dependency graphs before refactoring
   - Common libraries should depend on other common libraries, not on higher-level packages
   - Use the dependency hierarchy: utilities → core libraries → feature packages
   - If circular dependencies are unavoidable, consider splitting the library into smaller focused packages

4. **Create new common libraries when necessary**:
   - If functionality doesn't fit existing libraries
   - If adding it would create circular dependencies
   - Name new libraries following the pattern: `@sap-ux/[descriptive-name]`
   - Keep libraries focused on a single responsibility
   - Document the library's purpose and API

5. **Document library usage**: When using or extending common libraries:
   - Update the library's README with new functionality
   - Add JSDoc comments for all public APIs
   - Include usage examples in documentation
   - Update types for TypeScript consumers

### Internationalization (i18n)

**User-facing text must be translatable:**
- User dialogs and messages
- Button text and labels
- Questions and prompts

**Not required for:**
- Technical log messages
- Debugging/tracing information
- Exception texts not shown to users

### Pull Request Guidelines

From [CONTRIBUTING.md](CONTRIBUTING.md):

1. **One issue per PR** - Keep PRs small and focused
2. **Follow DCO** - Developer Certificate of Origin required
3. **Code review** - Wait for approval before merging
4. **Don't resolve conversations** - Let reviewers mark as resolved
5. **AI-generated code** - Follow [SAP's GenAI guidelines](https://github.com/SAP/.github/blob/main/CONTRIBUTING_USING_GENAI.md)

## Package Management

### Workspace Structure

**Root**: [pnpm-workspace.yaml](pnpm-workspace.yaml)
```yaml
packages:
    - 'packages/*'
    - 'examples/*'
    - 'tests/integration/*'
    - 'tests/fixtures/projects/mock'
    - 'types'
```

### Common Package Structure

```
packages/[package-name]/
├── src/              # Source code (TypeScript)
├── test/             # Unit tests
├── templates/        # Template files (for generators)
├── dist/             # Build output (generated)
├── coverage/         # Test coverage (generated)
├── package.json      # Package manifest
├── tsconfig.json     # TypeScript config
├── jest.config.js    # Jest config
├── eslint.config.js  # ESLint config (optional, extends root config)
└── README.md         # Package documentation
```

### Workspace Dependencies

**For internal monorepo packages**, use the `workspace:*` protocol to reference other packages in the workspace:

**Example** of workspace dependencies in package.json:
```json
{
  "dependencies": {
    "@sap-ux/logger": "workspace:*",
    "@sap-ux/ui5-config": "workspace:*"
  }
}
```

This ensures packages always use the local workspace version during development and are replaced with appropriate version ranges during publishing.

## Testing Requirements

### Unit Tests

**Location**: `test/` or `test/unit/` within each package

**Naming Convention**: Test files follow the pattern `*.test.ts`, typically matching the source file they test (e.g., `logger.ts` → `logger.test.ts`)

**Framework**: Jest with ts-jest

**Base config**: [jest.base.js](jest.base.js)

**Run tests:**
```bash
# All packages (run from repository root)
pnpm test

# Specific package - PREFERRED when working on a single package
pnpm --filter @sap-ux/[package-name] test

# or from the package folder
pnpm test

# With coverage
pnpm test # Coverage is collected by default
```

**IMPORTANT**: When working on a specific package, always use `pnpm --filter` to run only that package's tests. Running `pnpm test` at the root level tests ALL packages in the monorepo, which is slow and unnecessary for focused development.

**Best practices:**
- Use `describe` blocks to group related tests
- Use clear, descriptive test names
- Follow given/when/then structure
- Test edge cases and error conditions
- Use snapshots for generated files
- Mock external dependencies
- Keep tests fast and isolated

### Integration Tests

**Location**: `test/integration/` or `tests/integration/`

**Framework**: Playwright

**Run tests:**
```bash
# All packages
pnpm test:integration

# Specific package
pnpm --filter @sap-ux/[package-name] test:integration
```

**Playwright setup:**
- Browser: Chrome (cached by CI)
- Reports uploaded on failure
- Manual inspection via test output directory

### React Component Tests

**Use**: [react-testing-library](https://testing-library.com/docs/react-testing-library/intro)

**Don't use**: Enzyme (deprecated, doesn't support React 17+)

**Migration**: Issue [#833](https://github.com/SAP/open-ux-tools/issues/833) tracks Enzyme → react-testing-library migration

### Debug Support

**Environment variables:**
- `UX_DEBUG` - Enable debug logging
- `UX_DEBUG_FULL` - Enable verbose debug logging

## Security and Maintenance

### Dependency Audits

**Regular maintenance:**
1. Run `pnpm audit` weekly
2. Review and address high/critical vulnerabilities
3. Update dependencies quarterly
4. Document any exceptions

### Security Overrides

Located in root [package.json](package.json:80-90):
- Review existing overrides regularly
- Add new overrides for security patches
- Document reason for each override
- Remove obsolete overrides

### License Compliance

**License**: Apache-2.0

**REUSE compliance**:
- Check: `.github/workflows/reuse-compliance.yml`
- All files must have proper license headers
- See [REUSE specification](https://reuse.software/)

## Change Management

### Versioning Strategy

**Semantic Versioning (semver):**
- **MAJOR**: Breaking changes (incompatible API changes)
- **MINOR**: New features (backwards compatible)
- **PATCH**: Bug fixes (backwards compatible)

### Changeset Configuration

Config: [.changeset/config.json](.changeset/config.json)
- Changelog: `@changesets/cli/changelog`
- Access: public
- Base branch: `origin/main`
- Internal dependency updates: patch

### Release Process

**Automated via GitHub Actions:**

1. **Developer** creates changeset with changes
2. **CI** validates changeset on PR
3. **Merge** to main triggers version job
4. **Version job** runs `changeset version` to bump versions
5. **Release job** publishes to npmjs.com
6. **Notifications** sent to Slack
7. **VSCode extensions** packaged and released to GitHub

**VSCode Extension Release:**
- Automatic packaging on version bump
- GitHub release created (draft)
- `.vsix` file attached to release
- Manual approval required for publication

## Useful Commands

### Installation and Build

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Force rebuild (skip cache)
pnpm build:force

# Clean build artifacts
pnpm clean
```

### Development

```bash
# Format code
pnpm format

# Run linting
pnpm lint

# Fix lint issues
pnpm lint:fix

# Check dependency versions
pnpm lint:dependency-versions
```

### Testing

```bash
# Run all tests
pnpm test

# Run integration tests
pnpm test:integration

# Test specific package
pnpm --filter @sap-ux/[package-name] test
```

### Changesets

```bash
# Create changeset
pnpm cset

# Validate changesets
pnpm validate:changesets

# Preview version changes
pnpm changeset status
```

### Workspace Operations

```bash
# Add dependency to specific package
pnpm --filter @sap-ux/[package-name] add [dependency]

# Run command in specific package
pnpm --filter @sap-ux/[package-name] [command]

# Run command in all packages
pnpm -r [command]
```

### Debugging

```bash
# View dependency graph
pnpm graph-deps

# Check workspace structure
pnpm list --depth 0

# View outdated dependencies
pnpm outdated
```

## Additional Resources

- **Contributing Guide**: [CONTRIBUTING.md](CONTRIBUTING.md)
- **Development Guidelines**: [docs/Guidelines.md](docs/Guidelines.md)
- **Code of Conduct**: [docs/CODE_OF_CONDUCT.md](docs/CODE_OF_CONDUCT.md)
- **Version Overrides**: [docs/version-overrides.md](docs/version-overrides.md)
- **Main README**: [README.md](README.md)
- **CI/CD Pipeline**: [.github/workflows/pipeline.yml](.github/workflows/pipeline.yml)

## Common Pitfalls to Avoid

1. ❌ **Don't use npm or yarn** - Always use pnpm 8.14.0
2. ❌ **Don't skip tests** - All tests must pass before merging
3. ❌ **Don't forget changesets** - Required for all source code changes
4. ❌ **Don't mix dependency versions** - Keep versions aligned across packages
5. ❌ **Don't commit with lint errors** - Always run `pnpm lint:fix`
6. ❌ **Don't ignore security audits** - Address vulnerabilities promptly
7. ❌ **Don't skip documentation** - Update README and JSDoc as needed
8. ❌ **Don't break semver** - Follow semantic versioning strictly
9. ❌ **Don't commit generated files** - dist/, coverage/, etc. are gitignored
10. ❌ **Don't reduce code coverage** - Maintain or improve 80% threshold
11. ❌ **Don't duplicate code** - Reuse existing functions from common libraries like @sap-ux/project-access, @sap-ux/axios-extension, etc.
12. ❌ **Don't create circular dependencies** - Follow proper dependency hierarchy when refactoring to common libraries
13. ❌ **Don't run all tests when working on a single package** - Use `pnpm --filter @sap-ux/[package-name] test` instead of `pnpm test` at root
14. ❌ **Don't hardcode version numbers in documentation** - Reference source files (like package.json) instead, as versions change frequently

## Summary Checklist

Before submitting changes, verify:

- [ ] `pnpm install` succeeds
- [ ] `pnpm build` succeeds
- [ ] `pnpm lint` passes with no errors
- [ ] `pnpm test` passes with ≥80% coverage
- [ ] `pnpm lint:dependency-versions` passes
- [ ] Changeset created if source code or runtime dependencies changed
- [ ] No pnpm audit vulnerabilities introduced
- [ ] Code follows TypeScript and ESLint standards
- [ ] Tests follow given/when/then pattern
- [ ] Commit messages follow Conventional Commits
- [ ] PR is focused on one issue
- [ ] Documentation updated if needed

---

**Need Help?**
- Open an issue: https://github.com/SAP/open-ux-tools/issues
- Review existing docs: [CONTRIBUTING.md](CONTRIBUTING.md), [docs/Guidelines.md](docs/Guidelines.md)
- Check recent commits for examples
