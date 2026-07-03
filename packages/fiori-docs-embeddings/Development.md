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
  - [Updating sap.fe.test OPA5 API Docs](#updating-sapfetest-opa5-api-docs)
    - [Prerequisites](#prerequisites)
    - [Command](#command-2)
    - [Output](#output-2)
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
GITHUB_HOST=git_hostname GITHUB_TOKEN=your_token AI_CORE_SERVICE_KEY='{"serviceurls":{"AI_API_URL":""},"appname":"","clientid":"","clientsecret":"","identityzone":"","identityzoneid":"","url":""}' pnpm run update-docs
```

To run a single source instead of all sources, use the `--source=<id>` flag:

```bash
# Using the dedicated script shortcut
AI_CORE_SERVICE_KEY='...' pnpm run update-docs-opa-guide

# Or run any source by ID
AI_CORE_SERVICE_KEY='...' pnpm run update-docs-script -- --source=fiori-tools-opa-guide
```

Available source IDs: `btp-fiori-tools`, `sapui5`, `fiori-samples`, `fiori-showcase`, `tools-suite`, `fiori-tools-opa-guide`

### Environment Variables

The `AI_CORE_SERVICE_KEY` must be a JSON string containing the following fields:

- `serviceurls.AI_API_URL`: AI Core API URL
- `appname`: Application name
- `clientid`: OAuth client ID
- `clientsecret`: OAuth client secret
- `identityzone`: Identity zone
- `identityzoneid`: Identity zone ID
- `url`: Authentication URL

For sources requiring authenticated access (e.g., internal repositories):

- `GITHUB_HOST`: The GitHub host URL (e.g., `https://github.com`)
- `GITHUB_TOKEN`: Your GitHub personal access token for authentication

### Sources

| ID | Type | Description |
|---|---|---|
| `btp-fiori-tools` | github | SAP-docs/btp-fiori-tools — Fiori Tools documentation |
| `sapui5` | github | SAP-docs/sapui5 — UI5 Fiori Elements documentation |
| `fiori-samples` | github | SAP-samples/fiori-tools-samples — Sample applications |
| `fiori-showcase` | github | SAP-samples/fiori-elements-feature-showcase — Feature examples |
| `tools-suite` | github | ux-engineering/tools-suite — Internal Fiori Tools commands (requires `GITHUB_TOKEN`) |
| `fiori-tools-opa-guide` | github-raw | sap-tutorials/Tutorials — OPA mock server testing guide |

### Output

This command generates or updates the following files:

```
data_local/btp-fiori-tools.md
data_local/fiori-samples.md
data_local/fiori-showcase.md
data_local/fiori-tools-opa-guide.md
data_local/sapui5.md
data_local/tools-suite.md
```

---

## Updating sap.fe.test OPA5 API Docs

This script parses the `sap.fe.test` OPA5 testing library's public JSDoc API from a locally cloned copy of the `sap.fe` repository and produces a markdown file in the standard chunk format.

The output is picked up automatically by the embeddings build — no further registration is needed.

> **Note:** This script runs as part of `pnpm build`. If the `sap.fe` repository has not been cloned, it exits silently with a warning and the output file is simply not updated.

### Prerequisites

Clone the `sap.fe` repository into the expected location:

```bash
git clone <sap.fe-repo-url> data/git_repos/sap.fe
```

The script looks for API source files at:

```
data/git_repos/sap.fe/packages/sap.fe.test/src/sap/fe/test/api/
```

### Command

```bash
pnpm --filter @sap-ux/fiori-docs-embeddings run build-fe-test-api-docs
```

### Output

```
data_local/sap_fe_test_api.md
```

The file contains one chunk per public class (actions/assertions), plus a combined type definitions chunk and a combined enumerations chunk.

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