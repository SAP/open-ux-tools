# @sap-ux/semantic-search

A lightweight semantic search library that uses machine learning embeddings to find similar text content. Perfect for building search functionality, document similarity, and content recommendations.

## Installation

```bash
pnpm add @sap-ux/semantic-search
```

## Features

- **Portable**: Uses ONNX WebAssembly runtime for efficient embedding generation
- **Persistent**: Store and load embeddings to/from disk
- **Organized**: Group and register embeddings for easy management
- **Flexible**: Search single datasets or combine multiple sources
- **TypeScript**: Full TypeScript support with comprehensive type definitions
- **Dual Module Support**: Works with both CommonJS and ES modules

## Usage

### Basic Example: Create Embeddings with ID

```typescript
import { embeddings } from '@sap-ux/semantic-search';

// Create embeddings from text chunks
const chunks = [
  'The cat sat on the mat',
  'Dogs love to play fetch',
  'Birds fly in the sky'
];

// Generate embeddings with an ID and metadata
const animalEmbeddings = await embeddings(chunks, {
  id: 'animals',
  description: 'Animal-related content',
  labels: ['animals', 'nature']
});

console.log(animalEmbeddings.id); // 'animals'
```

### Search for Similar Content

```typescript
import { embeddings, search } from '@sap-ux/semantic-search';

const chunks = ['The cat sat on the mat', 'Dogs love to play fetch'];
const embedded = await embeddings(chunks);

// Search for similar content
const results = await search('feline on furniture', embedded);

console.log(results[0].content); // 'The cat sat on the mat'
console.log(results[0].similarity); // 0.87
```

### Store and Load Embeddings

```typescript
import { embeddings, store, load } from '@sap-ux/semantic-search';

// Create and store embeddings
const chunks = ['Content 1', 'Content 2'];
const embedded = await embeddings(chunks, { id: 'my-content' });
await store('./embeddings', embedded);

// Load later
const loaded = await load('./embeddings');
console.log(loaded[0].id); // 'my-content'
```

### Register and Load Multiple Embedding Sets

```typescript
import { register, loadRegistered } from '@sap-ux/semantic-search';

// Register embedding directories
await register('./embeddings/animals');
await register('./embeddings/vehicles');

// Load all registered embeddings
const allEmbeddings = await loadRegistered();
```

## API

### Functions

#### `embeddings(chunks, config?)`

Generate embeddings for text chunks.

- **chunks**: `string[]` or `{ content: string }[]` - Text content to embed
- **config**: Optional metadata including `id`, `description`, etc.
- **Returns**: `Promise<EmbeddingsWrapper>` - Wrapper object with embeddings and metadata

#### `search(query, embeddings, options?)`

Search for similar content using semantic similarity.

- **query**: `string` - Search query
- **embeddings**: Embeddings to search through (single or multiple datasets)
- **options**: Optional search options (`limit`, `weights`)
- **Returns**: `Promise<SearchResult[]>` - Results sorted by similarity

#### `store(dir, config)`

Store embeddings to disk.

- **dir**: `string` - Directory path
- **config**: `StoreConfig` - Embeddings wrapper with required `id`
- **Returns**: `Promise<void>`

#### `load(dir, config?)`

Load embeddings from disk.

- **dir**: `string` - Directory path
- **config**: Optional filter configuration
- **Returns**: `Promise<EmbeddingsWrapper[]>`

#### `register(path, registryDir?)`

Register embeddings by creating a symlink.

- **path**: `string` - Path to embeddings
- **registryDir**: Optional registry directory
- **Returns**: `Promise<void>`

#### `loadRegistered(config?, registryDir?)`

Load all registered embeddings.

- **config**: Optional filter configuration
- **registryDir**: Optional registry directory
- **Returns**: `Promise<EmbeddingsWrapper[]>`

#### `clearCache(id?)`

Clear the embeddings cache.

- **id**: Optional ID to clear specific entry
- **Returns**: `void`

### Constants

#### `rootDir: string`

The root data directory for the application.

#### `embeddingsDir: string`

The directory where registered embedding symlinks are stored.

## License

Apache-2.0

## Keywords

semantic, search, embeddings, similarity, nlp, sap, fiori
