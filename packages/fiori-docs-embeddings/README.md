[![Changelog](https://img.shields.io/badge/changelog-8A2BE2)](https://github.com/SAP/open-ux-tools/blob/main/packages/fiori-docs-embeddings/CHANGELOG.md) [![Github repo](https://img.shields.io/badge/github-repo-blue)](https://github.com/SAP/open-ux-tools/tree/main/packages/fiori-docs-embeddings)

# [`@sap-ux/fiori-docs-embeddings`](https://github.com/SAP/open-ux-tools/tree/main/packages/fiori-docs-embeddings)

A Node.js package that indexes SAP Fiori related documentation from multiple sources and generates vector embeddings for semantic search capabilities.

## What it does

This module- Crawls documentation from GitHub repositories (see Configuration for a list of default sources)
Example sources:

https://github.com/SAP-docs/btp-fiori-tools (Fiori Tools documentation)

https://github.com/SAP-docs/sapui5/tree/main/docs/06_SAP_Fiori_Elements (UI5 Fiori Elements documentation)

https://github.com/SAP-samples/fiori-tools-samples (Sample applications)

https://github.com/SAP-samples/fiori-elements-feature-showcase (Feature examples)

https://ui5.sap.com/test-resources/sap/fe/macros/designtime/apiref/api.json (Design Time API Reference)

https://ui5.sap.com/test-resources/sap/fe/core/fpmExplorer/index.html#/overview/introduction (SAP Fiori Development Portal)

https://github.com/SAP/open-ux-tools/blob/main/packages/create/README.md (Fiori Tools create documentation)

https://www.npmjs.com/package/@sap/ux-ui5-tooling (@sap/ux-ui5-tooling documentation)

https://github.com/sap-tutorials/Tutorials/blob/master/tutorials/fiori-tools-mockserver-opa-testing/fiori-tools-mockserver-opa-testing.md (OPA mock server testing guide)

- Parses markdown, JSON, TypeScript, and other file types
- Generates AI-powered vector embeddings using transformers
- Stores embeddings in a local LanceDB vector database
- Provides tools for semantic and keyword search across documentation

## Installation

```bash
npm install @sap-ux/fiori-docs-embeddings
```

## Usage

### Basic Usage

```javascript
import { getDataPath, getEmbeddingsPath } from '@sap-ux/fiori-docs-embeddings';

// Get paths to data directories
const docsPath = getDataPath();
const embeddingsPath = getEmbeddingsPath();
```

### Building Documentation Index

```bash
# Set GitHub token to avoid rate limits
export GITHUB_TOKEN=your_github_token

# Build documentation index (all sources)
npm run update-docs

# Build a single source by ID
npm run update-docs-script -- --source=fiori-tools-opa-guide

# Shortcut script for the OPA testing guide
npm run update-docs-opa-guide

# Generate embeddings
npm run update-embeddings

# Or do both
npm run update-all
```

### Available Scripts

- `update-docs` - Crawl and index documentation from all configured sources
- `update-docs-script -- --source=<id>` - Crawl a single source by ID
- `update-docs-opa-guide` - Fetch only the OPA mock server testing guide
- `update-embeddings` - Generate vector embeddings from indexed documents  
- `update-all` - Run both documentation indexing and embedding generation

### Configuration

The module indexes documentation from these sources by default:

| Source ID | Description |
|---|---|
| `btp-fiori-tools` | SAP-docs/btp-fiori-tools — Fiori Tools documentation |
| `sapui5` | SAP-docs/sapui5 — UI5 Fiori Elements documentation |
| `fiori-samples` | SAP-samples/fiori-tools-samples — Sample applications |
| `fiori-showcase` | SAP-samples/fiori-elements-feature-showcase — Feature examples |
| `tools-suite` | ux-engineering/tools-suite — Internal Fiori Tools commands (requires `GITHUB_TOKEN`) |
| `fiori-tools-opa-guide` | sap-tutorials/Tutorials — OPA mock server testing guide |

### Environment Variables

- `GITHUB_TOKEN` - GitHub personal access token (recommended to avoid rate limits)

### Data Structure

Generated data is organized as:
```
data/
├── docs/           # Parsed documentation files
├── embeddings/     # Vector database (LanceDB)
└── search/         # Search indexes
```

## Features

- **Multi-source indexing** - Supports GitHub repositories and JSON APIs
- **File type support** - Markdown, JSON, TypeScript, JavaScript, XML, YAML, and more
- **Vector embeddings** - Uses sentence-transformers/all-MiniLM-L6-v2 model
- **Local storage** - All data stored locally with LanceDB
- **Caching** - Intelligent caching to avoid unnecessary API calls
- **Chunking** - Smart document chunking for optimal embedding generation

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Check types
npm run build-compiler

# Clean generated files
npm run clean
```

## License

Apache-2.0