import fs from 'fs/promises';
import path from 'path';
import { embeddings, store, load, search, clearCache, register, registered, loadRegistered } from '../src/embeddings';

const TEST_DIR = path.join(__dirname, 'temp-store-load-test');
const REGISTRY_DIR = path.join(__dirname, 'temp-registry-test');

jest.setTimeout(60000); // Increase timeout for async operations

describe('store and load functionality', () => {
    beforeEach(async () => {
        // Clean up test directories before each test
        try {
            await fs.rm(TEST_DIR, { recursive: true, force: true });
        } catch {
            // Ignore cleanup errors
        }
        try {
            await fs.rm(REGISTRY_DIR, { recursive: true, force: true });
        } catch {
            // Ignore cleanup errors
        }
        clearCache();
    });

    afterAll(async () => {
        // Clean up test directories after all tests
        try {
            await fs.rm(TEST_DIR, { recursive: true, force: true });
        } catch {
            // Ignore cleanup errors
        }
        try {
            await fs.rm(REGISTRY_DIR, { recursive: true, force: true });
        } catch {
            // Ignore cleanup errors
        }
    });

    it('should store and load embeddings with basic data', async () => {
        // Create test data
        const chunks = ['The cat sat on the mat', 'Dogs love to play fetch', 'Birds fly in the sky'];

        // Generate embeddings with config
        const embeddedData = await embeddings(chunks, {
            id: 'test-basic',
            description: 'Basic test data'
        });

        // Verify the structure
        expect(embeddedData.id).toBe('test-basic');
        expect(embeddedData.description).toBe('Basic test data');
        expect(Array.isArray(embeddedData.embeddings)).toBe(true);
        expect(embeddedData.embeddings.length).toBe(3);

        // Store to disk
        await store(TEST_DIR, embeddedData as any);

        const filePath = `${TEST_DIR}/${embeddedData.id}`;
        // Verify files were created
        const metaExists = await fs
            .access(`${filePath}.meta.json`)
            .then(() => true)
            .catch(() => false);
        const jsonExists = await fs
            .access(`${filePath}.json`)
            .then(() => true)
            .catch(() => false);
        const binExists = await fs
            .access(`${filePath}.bin`)
            .then(() => true)
            .catch(() => false);

        expect(metaExists).toBe(true);
        expect(jsonExists).toBe(true);
        expect(binExists).toBe(true);

        // Load back from disk
        const loaded = await load(TEST_DIR);

        // Verify loaded data structure
        expect(Array.isArray(loaded)).toBe(true);
        expect(loaded.length).toBe(1);

        const loadedData = loaded[0];
        expect(loadedData.id).toBe('test-basic');
        expect(loadedData.description).toBe('Basic test data');
        expect(Array.isArray(loadedData.embeddings)).toBe(true);
        expect(loadedData.embeddings.length).toBe(3);

        // Verify content matches
        for (let i = 0; i < chunks.length; i++) {
            expect(loadedData.embeddings[i].content).toBe(chunks[i]);
            expect(loadedData.embeddings[i].embedding).toBeInstanceOf(Float32Array);
            expect(loadedData.embeddings[i].embedding!.length).toBe(384);
        }

        // Verify embeddings match (compare first few values)
        for (let i = 0; i < 3; i++) {
            const originalEmbedding = embeddedData.embeddings[0].embedding!;
            const loadedEmbedding = loadedData.embeddings[0].embedding!;
            for (let j = 0; j < 10; j++) {
                expect(Math.abs(originalEmbedding[j] - loadedEmbedding[j])).toBeLessThan(0.0001);
            }
        }
    });

    it('should perform search on loaded embeddings', async () => {
        // Create and store test data
        const chunks = ['Cats are cute animals', 'Dogs are loyal pets', 'Birds can fly high'];

        const embeddedData = await embeddings(chunks, {
            id: 'test-search',
            description: 'Search test data'
        });

        await store(TEST_DIR, embeddedData as any);

        // Load from disk
        const loaded = await load(TEST_DIR);
        expect(loaded.length).toBe(1);

        // Search
        const results = await search('feline creatures', loaded);

        expect(Array.isArray(results)).toBe(true);
        expect(results.length).toBe(3);
        expect(results[0]).toHaveProperty('similarity');
        expect(results[0].content).toBeTruthy();

        // Results should be sorted by similarity
        for (let i = 0; i < results.length - 1; i++) {
            expect(results[i].similarity).toBeGreaterThanOrEqual(results[i + 1].similarity);
        }
    });

    it('should handle search with limit option', async () => {
        const chunks = ['First item', 'Second item', 'Third item', 'Fourth item'];
        const embeddedData = await embeddings(chunks, { id: 'test-limit' });

        const results = await search('item', embeddedData, { limit: 2 });

        expect(results.length).toBe(2);
    });

    it('should handle search with weights', async () => {
        const chunks1 = ['Important document'];
        const chunks2 = ['Less important document'];

        const embedded1 = await embeddings(chunks1, { id: 'high-priority' });
        const embedded2 = await embeddings(chunks2, { id: 'low-priority' });

        const results = await search('document', [embedded1, embedded2], {
            weights: { 'high-priority': 2.0, 'low-priority': 0.5 }
        });

        expect(results.length).toBe(2);
        expect(results[0].similarity).toBeGreaterThan(results[1].similarity);
    });

    it('should handle search with array of arrays', async () => {
        const chunks1 = ['First dataset'];
        const chunks2 = ['Second dataset'];

        const embedded1 = await embeddings(chunks1, { id: 'dataset1' });
        const embedded2 = await embeddings(chunks2, { id: 'dataset2' });

        const results = await search('dataset', [embedded1.embeddings, embedded2.embeddings]);

        expect(results.length).toBe(2);
    });

    it('should handle embeddings with object chunks', async () => {
        const chunks = [
            { content: 'Text one', metadata: 'meta1' },
            { content: 'Text two', metadata: 'meta2' }
        ];

        const result = await embeddings(chunks, { id: 'test-objects' });

        expect(result.embeddings.length).toBe(2);
        expect(result.embeddings[0].metadata).toBe('meta1');
        expect(result.embeddings[1].metadata).toBe('meta2');
    });

    it('should handle embeddings with missing content', async () => {
        const chunks = [{ content: 'Valid content' }, {} as any, { notContent: 'invalid' } as any];

        const result = await embeddings(chunks);

        expect(result.embeddings.length).toBe(3);
        expect(result.embeddings[0].content).toBe('Valid content');
        expect(result.embeddings[1].content).toBe('');
        expect(result.embeddings[2].content).toBe('');
    });

    it('should handle load with filtering', async () => {
        const chunks1 = ['Data one'];
        const chunks2 = ['Data two'];

        const embedded1 = await embeddings(chunks1, { id: 'test1', category: 'A' });
        const embedded2 = await embeddings(chunks2, { id: 'test2', category: 'B' });

        await store(TEST_DIR, embedded1 as any);
        await store(TEST_DIR, embedded2 as any);

        const loaded = await load(TEST_DIR, { category: 'A' });

        expect(loaded.length).toBe(1);
        expect(loaded[0].id).toBe('test1');
    });

    it('should handle load with array filtering', async () => {
        const chunks1 = ['Data one'];
        const chunks2 = ['Data two'];
        const chunks3 = ['Data three'];

        const embedded1 = await embeddings(chunks1, { id: 'test1', tags: ['tag1', 'tag2'] });
        const embedded2 = await embeddings(chunks2, { id: 'test2', tags: ['tag3'] });
        const embedded3 = await embeddings(chunks3, { id: 'test3', tags: ['tag1', 'tag4'] });

        await store(TEST_DIR, embedded1 as any);
        await store(TEST_DIR, embedded2 as any);
        await store(TEST_DIR, embedded3 as any);

        const loaded = await load(TEST_DIR, { tags: ['tag1'] });

        expect(loaded.length).toBe(2);
        expect(loaded.map((l) => l.id).sort()).toEqual(['test1', 'test3']);
    });

    it('should use cache on second load', async () => {
        const chunks = ['Cached data'];
        const embeddedData = await embeddings(chunks, { id: 'test-cache' });

        await store(TEST_DIR, embeddedData as any);

        const loaded1 = await load(TEST_DIR);
        const loaded2 = await load(TEST_DIR);

        // Second load should use cache (same instance)
        expect(loaded1[0]).toBe(loaded2[0]);
    });

    it('should clear cache by ID', async () => {
        const chunks = ['Data to cache'];
        const embeddedData = await embeddings(chunks, { id: 'test-clear-id' });

        await store(TEST_DIR, embeddedData as any);
        await load(TEST_DIR); // Populate cache

        clearCache('test-clear-id');

        const loaded = await load(TEST_DIR);
        expect(loaded.length).toBe(1);
    });

    it('should throw error when loading non-existent path', async () => {
        await expect(load('/non/existent/path')).rejects.toThrow('Path does not exist');
    });

    it('should return empty array when no meta files found', async () => {
        await fs.mkdir(TEST_DIR, { recursive: true });
        const loaded = await load(TEST_DIR);
        expect(loaded).toEqual([]);
    });

    it('should throw error when storing invalid config', async () => {
        await expect(store(TEST_DIR, {} as any)).rejects.toThrow('Invalid config format');
        await expect(store(TEST_DIR, { id: 'test' } as any)).rejects.toThrow('Invalid config format');
        await expect(store(TEST_DIR, { embeddings: [] } as any)).rejects.toThrow('Invalid config format');
    });

    it('should handle register and loadRegistered', async () => {
        // Create and store test data
        const chunks = ['Registered data'];
        const embeddedData = await embeddings(chunks, { id: 'test-register' });
        await store(TEST_DIR, embeddedData as any);

        // Register the directory
        await register(TEST_DIR, REGISTRY_DIR);

        // Load registered embeddings
        const loaded = await loadRegistered(undefined, REGISTRY_DIR);

        expect(loaded.length).toBe(1);
        expect(loaded[0].id).toBe('test-register');
    });

    it('should handle registered metadata only', async () => {
        const chunks = ['Metadata test'];
        const embeddedData = await embeddings(chunks, { id: 'test-meta', description: 'Test metadata' });
        await store(TEST_DIR, embeddedData as any);

        await register(TEST_DIR, REGISTRY_DIR);

        const metadata = await registered(undefined, REGISTRY_DIR);

        expect(metadata.length).toBe(1);
        expect(metadata[0].id).toBe('test-meta');
        expect(metadata[0].description).toBe('Test metadata');
    });

    it('should handle register with filtering', async () => {
        const chunks1 = ['Data A'];
        const chunks2 = ['Data B'];

        const embedded1 = await embeddings(chunks1, { id: 'test1', type: 'A' });
        const embedded2 = await embeddings(chunks2, { id: 'test2', type: 'B' });

        const dir1 = path.join(TEST_DIR, 'dir1');
        const dir2 = path.join(TEST_DIR, 'dir2');

        await store(dir1, embedded1 as any);
        await store(dir2, embedded2 as any);

        await register(dir1, REGISTRY_DIR);
        await register(dir2, REGISTRY_DIR);

        const loaded = await loadRegistered({ type: 'A' }, REGISTRY_DIR);

        expect(loaded.length).toBe(1);
        expect(loaded[0].id).toBe('test1');
    });

    it('should throw error when registering non-existent path', async () => {
        await expect(register('/non/existent/path', REGISTRY_DIR)).rejects.toThrow('Path does not exist');
    });

    it('should handle re-registering same path', async () => {
        const chunks = ['Re-register test'];
        const embeddedData = await embeddings(chunks, { id: 'test-reregister' });
        await store(TEST_DIR, embeddedData as any);

        await register(TEST_DIR, REGISTRY_DIR);
        await register(TEST_DIR, REGISTRY_DIR); // Re-register should work

        const loaded = await loadRegistered(undefined, REGISTRY_DIR);
        expect(loaded.length).toBe(1);
    });

    it('should return empty array for non-existent registry', async () => {
        const loaded = await loadRegistered(undefined, '/non/existent/registry');
        expect(loaded).toEqual([]);
    });
});
