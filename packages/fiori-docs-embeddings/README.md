# SAP Fiori Tools Documentation MCP Server

A Model Context Protocol (MCP) server that indexes and provides contextual access to SAP BTP Fiori Tools documentation from the GitHub repository.

## Features

- **Full Documentation Indexing**: Automatically crawls and indexes all markdown files from the SAP-docs/btp-fiori-tools repository
- **Vector Database Integration**: Local LanceDB with AI-powered embeddings for semantic search
- **Hybrid Search**: Combined keyword and semantic search for optimal results
- **Smart Search**: Full-text search with relevance scoring across titles, headers, and content
- **Semantic Understanding**: Find conceptually related content, not just keyword matches
- **Document Similarity**: Discover related documentation automatically
- **Category Browsing**: Browse documents by topic categories
- **Offline-First**: Complete functionality without internet connection (after initial setup)
- **Resource Access**: Access individual documents via standardized MCP URIs
- **Caching**: Built-in caching mechanism for improved performance
- **Real-time Updates**: Ability to refresh the index from the latest GitHub content

## Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd @sap-ux/fiori-docs-embeddings

# Install dependencies
npm install

# Build the project
npm run build
```

## Configuration

Configure the server using environment variables:

- `GITHUB_TOKEN`: GitHub personal access token (recommended to avoid rate limits)
- `CACHE_DURATION`: Cache duration in milliseconds (default: 3600000 = 1 hour)
- `SERVER_PORT`: Server port (default: 3000)
- `LOG_LEVEL`: Logging level (default: info)

### GitHub Token Setup

To avoid GitHub API rate limits, it's highly recommended to set up a personal access token:

1. Go to GitHub Settings > Developer settings > Personal access tokens
2. Generate a new token (classic) with `public_repo` scope
3. Set the `GITHUB_TOKEN` environment variable:

```bash
export GITHUB_TOKEN=your_token_here
```

Or create a `.env` file:
```
GITHUB_TOKEN=your_token_here
```

## Usage

### Running the Server

```bash
# Start the server
npm start

# Development mode with auto-reload
npm run dev
```

### MCP Resources

The server exposes documentation as MCP resources with URIs in the format:
```
sap-fiori://docs/{category}/{document-id}
```

### Available Tools

1. **search_docs**: Traditional keyword search through all documentation
   ```json
   {
     "query": "fiori application generation",
     "maxResults": 10
   }
   ```

2. **semantic_search**: AI-powered semantic search using vector embeddings
   ```json
   {
     "query": "how to build fiori apps",
     "maxResults": 10
   }
   ```

3. **hybrid_search**: Combined keyword + semantic search for best results
   ```json
   {
     "query": "fiori deployment guide",
     "maxResults": 10
   }
   ```

4. **find_similar**: Find documents similar to a given document
   ```json
   {
     "documentId": "generating-an-application-overview",
     "maxResults": 5
   }
   ```

5. **browse_category**: Browse documents in a specific category
   ```json
   {
     "category": "Generating-an-Application"
   }
   ```

6. **list_categories**: List all available categories

7. **vector_stats**: Get vector database statistics and capabilities

8. **refresh_index**: Refresh the documentation index from GitHub

## Development

```bash
# Run tests
npm test

# Lint code
npm run lint

# Clean build artifacts
npm run clean
```

## Architecture

- **GitHub Service**: Interfaces with GitHub API to fetch documentation files
- **Document Parser**: Parses markdown files and extracts metadata
- **Vector Database**: LanceDB with local embeddings for semantic search
- **Embedding Service**: Transforms text into vector embeddings (384-dimensional)
- **Document Chunker**: Splits large documents for optimal embedding
- **Indexer**: Builds both keyword and vector search indexes
- **Cache Service**: Provides caching for improved performance
- **MCP Server**: Implements the Model Context Protocol interface

### Vector Database Features

- **Local Embeddings**: Uses `sentence-transformers/all-MiniLM-L6-v2` model
- **Offline Operation**: No external API calls required after setup
- **Document Chunking**: Handles large documents with 1000-char chunks and 200-char overlap
- **Persistent Storage**: LanceDB stores vectors locally for fast access
- **Similarity Search**: Sub-second semantic queries on thousands of documents

## API Schema

### Document Structure
```typescript
interface DocumentMeta {
  id: string;
  title: string;
  category: string;
  path: string;
  lastModified: Date;
  tags: string[];
  headers: string[];
  content?: string;
  excerpt?: string;
}
```

### Search Results
```typescript
interface SearchResult {
  document: DocumentMeta;
  score: number;
  matches: string[];
}
```

## License

MIT