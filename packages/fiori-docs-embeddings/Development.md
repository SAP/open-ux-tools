# Development Guide

This guide explains how to update and manage the local documentation files for the Fiori Documentation Embeddings package.

---

## Table of Contents

- [Development Guide](#development-guide)
  - [Table of Contents](#table-of-contents)
  - [Updating Fiori Development Portal](#updating-fiori-development-portal)
    - [Command](#command)
    - [Environment Variables](#environment-variables)
    - [Output](#output)
  - [Updating Fiori Help Documents](#updating-fiori-help-documents)
    - [Command](#command-1)
    - [Environment Variables](#environment-variables-1)
    - [Output](#output-1)
  - [Adding Custom Documentation](#adding-custom-documentation)
    - [Example](#example)
    - [File Structure](#file-structure)
    - [Important Notes](#important-notes)
  - [Best Practices](#best-practices)

---

## Updating Fiori Development Portal

This process clones the Fiori Elements Git repository, transforms the source content to markdown, and outputs it to the local data directory.

### Command

```bash
GITHUB_HOST=github.host GITHUB_TOKEN=xxxxxxxx pnpm run update-local-docs
```

### Environment Variables

- `GITHUB_HOST`: Your GitHub host (e.g., `github.com`)
- `GITHUB_TOKEN`: Your GitHub personal access token

### Output

This command generates or updates the following file:

```
data_local/fiori_development_portal.md
```

---

## Updating Fiori Help Documents

This process fetches and processes documentation from various Fiori sources using LLM optimization. The update is time-consuming and typically takes **1-2 hours** to complete for all sources.

### Command

```bash
AI_CORE_SERVICE_KEY='{"serviceurls":{"AI_API_URL":""},"appname":"","clientid":"","clientsecret":"","identityzone":"","identityzoneid":"","url":""}' pnpm run update-docs
```

### Environment Variables

The `AI_CORE_SERVICE_KEY` must be a JSON string containing the following fields:

- `serviceurls.AI_API_URL`: AI Core API URL
- `appname`: Application name
- `clientid`: OAuth client ID
- `clientsecret`: OAuth client secret
- `identityzone`: Identity zone
- `identityzoneid`: Identity zone ID
- `url`: Authentication URL

### Output

This command generates or updates the following files:

```
data_local/btp-fiori-tools.md
data_local/fiori-samples.md
data_local/fiori-showcase.md
data_local/sapui5.md
```

---

## Adding Custom Documentation

You can supplement the documentation by adding custom markdown files to the `data_local` directory. These files will be automatically indexed during the build process.

### Example

See `data_local/fiori_development_portal_extension.md` for a reference implementation.

### File Structure

Each custom documentation file should follow this structure:

```markdown
--------------------------------

**TITLE**: [Your documentation title]

**INTRODUCTION**: [Brief introduction explaining the purpose]

**TAGS**: [comma, separated, tags]

**STEP**: [Step title or number]

**DESCRIPTION**: [Detailed description of what needs to be done]

**LANGUAGE**: [Programming language, e.g., JSON, TypeScript, CDS]

**CODE**:
```language
[Your code example here]
```

**ADDITIONAL RELATED CODE BLOCKS** (optional):

**FILE**: [filename.ext]

**LANGUAGE**: [language]

**CODE**:
```language
[Related code example]
```

--------------------------------
```

### Important Notes

- Each documentation snippet must be delimited by `--------------------------------`
- Multiple snippets can be included in a single file
- The structure ensures proper parsing and indexing for RAG-based code generation
- All markdown files in `data_local/` are automatically processed during builds

---

## Best Practices

1. **Keep snippets focused**: Each snippet should cover a single, well-defined topic
2. **Use descriptive titles**: Make titles searchable and clear
3. **Add relevant tags**: Tags improve discoverability in RAG queries
4. **Include complete examples**: Code blocks should be self-contained and runnable
5. **Follow the structure**: Maintain the documented format for consistent parsing