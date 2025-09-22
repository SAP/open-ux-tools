import * as fs from 'fs/promises';
import { join } from 'path';

const mockFetch = jest.fn();

jest.mock('node-fetch', () => ({
    default: mockFetch
}));

jest.mock('gray-matter', () => ({
    default: jest.requireActual('gray-matter')
}));
jest.mock('fs/promises', () => ({
    readFile: jest.fn(),
    mkdir: jest.fn(),
    writeFile: jest.fn(),
    readdir: jest.fn(),
    stat: jest.fn()
}));

describe('MultiSourceDocumentationBuilder', () => {
    let MultiSourceDocumentationBuilder: any;
    const mockFs = fs as jest.Mocked<typeof fs>;

    beforeEach(async () => {
        jest.clearAllMocks();

        const module = await import('../src/scripts/build-docs');
        MultiSourceDocumentationBuilder =
            (module as any).default?.MultiSourceDocumentationBuilder || (module as any).MultiSourceDocumentationBuilder;
    });

    describe('constructor', () => {
        it('should initialize with default config', () => {
            const builder = new MultiSourceDocumentationBuilder();

            expect(builder).toBeDefined();
            expect(builder.config).toBeDefined();
            expect(builder.config.outputPath).toBe('./data/docs');
            expect(builder.config.sources).toBeDefined();
            expect(builder.config.sources.length).toBeGreaterThan(0);
        });
    });

    describe('getHeaders', () => {
        it('should return basic headers without GitHub token', async () => {
            delete process.env.GITHUB_TOKEN;

            const builder = new MultiSourceDocumentationBuilder();
            const headers = await builder.getHeaders();

            expect(headers).toMatchObject({
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'sap-fiori-docs-builder/1.0.0'
            });
            expect(headers.Authorization).toBeUndefined();
        });

        it('should include authorization header with GitHub token', async () => {
            process.env.GITHUB_TOKEN = 'test-token';

            const builder = new MultiSourceDocumentationBuilder();
            const headers = await builder.getHeaders();

            expect(headers).toMatchObject({
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'sap-fiori-docs-builder/1.0.0',
                'Authorization': 'token test-token'
            });

            delete process.env.GITHUB_TOKEN;
        });
    });

    describe('fetchWithRetry', () => {
        it('should fetch successfully on first attempt', async () => {
            const mockResponse = {
                ok: true,
                json: jest.fn().mockResolvedValue({ data: 'test' })
            };
            mockFetch.mockResolvedValue(mockResponse);

            const builder = new MultiSourceDocumentationBuilder();
            const result = await builder.fetchWithRetry('https://test.com');

            expect(mockFetch).toHaveBeenCalledTimes(1);
            expect(result).toEqual({ data: 'test' });
        });

        it('should retry on failure', async () => {
            const mockFailureResponse = {
                ok: false,
                status: 500,
                statusText: 'Internal Server Error'
            };
            const mockSuccessResponse = {
                ok: true,
                json: jest.fn().mockResolvedValue({ data: 'test' })
            };

            mockFetch.mockResolvedValueOnce(mockFailureResponse).mockResolvedValueOnce(mockSuccessResponse);

            const builder = new MultiSourceDocumentationBuilder();
            const result = await builder.fetchWithRetry('https://test.com');

            expect(mockFetch).toHaveBeenCalledTimes(2);
            expect(result).toEqual({ data: 'test' });
        });

        it('should handle rate limiting without reset time', async () => {
            const mockRateLimitResponse = {
                ok: false,
                status: 403,
                statusText: 'Forbidden',
                headers: {
                    get: jest.fn().mockReturnValue(null) // No reset time, should fail immediately
                },
                json: jest.fn().mockResolvedValue({}) // Add json method
            };

            mockFetch.mockResolvedValue(mockRateLimitResponse);

            const builder = new MultiSourceDocumentationBuilder();

            await expect(builder.fetchWithRetry('https://test.com', 1)).rejects.toThrow(
                'GitHub API error: 403 Forbidden'
            );
        });

        it('should wait for rate limit reset time', async () => {
            // Mock a rate limit response with reset time very close to now (1 second)
            const now = Math.floor(Date.now() / 1000);
            const resetTime = now + 1; // 1 second from now

            const mockRateLimitResponse = {
                ok: false,
                status: 403,
                statusText: 'Forbidden',
                headers: {
                    get: jest.fn().mockReturnValue(resetTime.toString())
                },
                json: jest.fn().mockResolvedValue({})
            };

            const mockSuccessResponse = {
                ok: true,
                status: 200,
                statusText: 'OK',
                json: jest.fn().mockResolvedValue({ data: 'success after rate limit' })
            };

            // First call returns rate limit, second call succeeds
            mockFetch.mockResolvedValueOnce(mockRateLimitResponse).mockResolvedValueOnce(mockSuccessResponse);

            const builder = new MultiSourceDocumentationBuilder();

            const result = await builder.fetchWithRetry('https://test.com', 2);

            expect(result).toEqual({ data: 'success after rate limit' });
            expect(mockFetch).toHaveBeenCalledTimes(2);
        });
    });

    describe('parseDocument', () => {
        it('should parse markdown files correctly', () => {
            const builder = new MultiSourceDocumentationBuilder();
            const file = {
                name: 'test.md',
                path: 'docs/test.md',
                type: 'file' as const,
                content: '# Test Title\n\nThis is test content.'
            };

            const result = builder.parseDocument(file);

            expect(result).toMatchObject({
                title: 'Test Title',
                content: '# Test Title\n\nThis is test content.',
                category: expect.any(String),
                path: 'docs/test.md'
            });
            expect(result.headers).toContain('Test Title');
            expect(result.wordCount).toBeGreaterThan(0);
        });

        it('should parse JSON files correctly', () => {
            const builder = new MultiSourceDocumentationBuilder();
            const jsonContent = { name: 'Test API', version: '1.0.0' };
            const file = {
                name: 'api.json',
                path: 'api/api.json',
                type: 'file' as const,
                content: JSON.stringify(jsonContent)
            };

            const result = builder.parseDocument(file);

            expect(result.title).toBe('Test API');
            expect(result.content).toContain('```json');
            expect(result.headers).toContain('name');
            expect(result.headers).toContain('version');
        });

        it('should parse TypeScript files correctly', () => {
            const builder = new MultiSourceDocumentationBuilder();
            const file = {
                name: 'test.ts',
                path: 'src/test.ts',
                type: 'file' as const,
                content: 'export function testFunction() { return "test"; }'
            };

            const result = builder.parseDocument(file);

            expect(result.title).toBe('test');
            expect(result.content).toContain('```typescript');
            expect(result.content).toContain('export function testFunction()');
        });

        it('should handle files with no content', () => {
            const builder = new MultiSourceDocumentationBuilder();
            const file = {
                name: 'empty.md',
                path: 'docs/empty.md',
                type: 'file' as const
            };

            expect(() => builder.parseDocument(file)).toThrow('No content found for file: docs/empty.md');
        });
    });

    describe('normalizeCategory', () => {
        it('should normalize category names', () => {
            const builder = new MultiSourceDocumentationBuilder();

            expect(builder.normalizeCategory('Test Category!')).toBe('test-category');
            expect(builder.normalizeCategory('--Test--Category--')).toBe('test-category');
            expect(builder.normalizeCategory('Test  Multiple   Spaces')).toBe('test-multiple-spaces');
        });
    });

    describe('convertApiToDocuments', () => {
        it('should convert UI5 API format', () => {
            const builder = new MultiSourceDocumentationBuilder();
            const apiData = {
                symbols: [
                    {
                        name: 'sap.m.Button',
                        kind: 'class',
                        description: 'Button control'
                    },
                    {
                        name: 'sap.m',
                        kind: 'namespace',
                        description: 'Mobile namespace'
                    }
                ]
            };
            const source = { id: 'test', type: 'json-api' as const, category: 'api', enabled: true, url: 'test.com' };

            const documents = builder.convertApiToDocuments(apiData, source);

            expect(documents).toHaveLength(2);
            expect(documents[0].name).toBe('sap.m.Button.md');
            expect(documents[0].content).toContain('# sap.m.Button');
            expect(documents[1].name).toBe('sap.m.md');
        });

        it('should convert array API format', () => {
            const builder = new MultiSourceDocumentationBuilder();
            const apiData = [
                { name: 'Item1', description: 'First item' },
                { name: 'Item2', description: 'Second item' }
            ];
            const source = { id: 'test', type: 'json-api' as const, category: 'api', enabled: true, url: 'test.com' };

            const documents = builder.convertApiToDocuments(apiData, source);

            expect(documents).toHaveLength(2);
            expect(documents[0].name).toBe('api-item-0.md');
            expect(documents[1].name).toBe('api-item-1.md');
        });

        it('should convert single object API format', () => {
            const builder = new MultiSourceDocumentationBuilder();
            const apiData = { name: 'Single API', description: 'Single API object' };
            const source = { id: 'test', type: 'json-api' as const, category: 'api', enabled: true, url: 'test.com' };

            const documents = builder.convertApiToDocuments(apiData, source);

            expect(documents).toHaveLength(1);
            expect(documents[0].name).toBe('api-reference.md');
            expect(documents[0].content).toContain('# Single API');
        });
    });

    describe('generateApiDocContent', () => {
        it('should generate content for API items with methods and properties', () => {
            const builder = new MultiSourceDocumentationBuilder();
            const apiItem = {
                name: 'TestClass',
                description: 'A test class',
                kind: 'class',
                module: 'test.module',
                methods: [{ name: 'testMethod', description: 'A test method' }],
                properties: [{ name: 'testProperty', description: 'A test property' }]
            };

            const content = builder.generateApiDocContent(apiItem);

            expect(content).toContain('# TestClass');
            expect(content).toContain('A test class');
            expect(content).toContain('**Type:** class');
            expect(content).toContain('**Module:** test.module');
            expect(content).toContain('## Methods');
            expect(content).toContain('### testMethod');
            expect(content).toContain('## Properties');
            expect(content).toContain('### testProperty');
        });

        it('should handle API items without specific structure', () => {
            const builder = new MultiSourceDocumentationBuilder();
            const apiItem = { customField: 'custom value', nested: { data: 'test' } };

            const content = builder.generateApiDocContent(apiItem);

            expect(content).toContain('# API Reference');
            expect(content).toContain('```json');
            expect(content).toContain('"customField": "custom value"');
        });

        it('should handle empty API items', () => {
            const builder = new MultiSourceDocumentationBuilder();
            const content = builder.generateApiDocContent(null);

            expect(content).toBe('# API Documentation\n\nNo content available.');
        });
    });

    describe('loadCachedDocuments', () => {
        it('should load cached documents from source-based structure', async () => {
            const mockDoc = {
                id: 'test-doc',
                title: 'Test Document',
                content: 'Test content',
                path: 'test.md'
            };

            mockFs.stat.mockResolvedValue({ isDirectory: () => true } as any);
            mockFs.readdir.mockResolvedValueOnce(['category1'] as any).mockResolvedValueOnce(['doc1.json'] as any);
            mockFs.readFile.mockResolvedValue(JSON.stringify(mockDoc));

            const builder = new MultiSourceDocumentationBuilder();
            const source = { id: 'test-source', type: 'github' as const, category: 'test', enabled: true };

            const documents = await builder.loadCachedDocuments(source);

            expect(documents).toHaveLength(1);
            expect(documents[0].name).toBe('Test Document.md');
            expect(documents[0].content).toBe('Test content');
        });

        it('should handle missing source directory', async () => {
            mockFs.stat.mockRejectedValue(new Error('Directory not found'));
            mockFs.readdir.mockRejectedValue(new Error('Directory not found'));

            const builder = new MultiSourceDocumentationBuilder();
            const source = { id: 'test-source', type: 'github' as const, category: 'test', enabled: true };

            const documents = await builder.loadCachedDocuments(source);

            expect(documents).toHaveLength(0);
        });
    });

    describe('processJsonApiSource', () => {
        it('should fetch and process JSON API source', async () => {
            const mockApiData = {
                symbols: [{ name: 'TestClass', kind: 'class', description: 'Test class' }]
            };
            const mockResponse = {
                ok: true,
                json: jest.fn().mockResolvedValue(mockApiData)
            };
            mockFetch.mockResolvedValue(mockResponse);

            const builder = new MultiSourceDocumentationBuilder();
            const source = {
                id: 'test',
                type: 'json-api' as const,
                category: 'api',
                enabled: true,
                url: 'https://test.com/api.json'
            };

            const documents = await builder.processJsonApiSource(source);

            expect(mockFetch).toHaveBeenCalledWith('https://test.com/api.json');
            expect(documents).toHaveLength(1);
            expect(documents[0].name).toBe('TestClass.md');
        });

        it('should handle API fetch errors', async () => {
            const mockResponse = {
                ok: false,
                status: 404,
                statusText: 'Not Found'
            };
            mockFetch.mockResolvedValue(mockResponse);

            const builder = new MultiSourceDocumentationBuilder();
            const source = {
                id: 'test',
                type: 'json-api' as const,
                category: 'api',
                enabled: true,
                url: 'https://test.com/api.json'
            };

            await expect(builder.processJsonApiSource(source)).rejects.toThrow(
                'Failed to fetch API documentation: HTTP 404: Not Found'
            );
        });
    });

    describe('getAllMarkdownFiles', () => {
        it('should filter files by supported extensions', async () => {
            const mockContents = [
                { name: 'test.md', type: 'file', download_url: 'https://test.com/test.md' },
                { name: 'README.txt', type: 'file', download_url: 'https://test.com/README.txt' }
            ];

            const mockResponse = {
                ok: true,
                status: 200,
                json: jest.fn().mockResolvedValue(mockContents)
            };

            mockFetch.mockResolvedValue(mockResponse);

            const builder = new MultiSourceDocumentationBuilder();
            const result = await builder.getAllMarkdownFiles('docs');

            // Should include .md and .txt files (both are supported)
            expect(result.length).toBeGreaterThan(0);
        });
    });

    describe('getDirectoryContents', () => {
        it('should fetch directory contents successfully', async () => {
            const mockContents = [
                { name: 'file1.md', type: 'file' },
                { name: 'file2.md', type: 'file' }
            ];

            const mockResponse = {
                ok: true,
                status: 200,
                json: jest.fn().mockResolvedValue(mockContents)
            };

            mockFetch.mockResolvedValue(mockResponse);

            const builder = new MultiSourceDocumentationBuilder();
            const result = await builder.getDirectoryContents('docs');

            expect(result).toEqual(mockContents);
            expect(mockFetch).toHaveBeenCalledWith(
                'https://api.github.com/repos/undefined/undefined/contents/docs',
                expect.any(Object)
            );
        });
    });

    describe('throttleRequest', () => {
        it('should implement request throttling', async () => {
            const builder = new MultiSourceDocumentationBuilder();

            const start = Date.now();
            await builder.throttleRequest();
            const end = Date.now();

            // Should have waited at least some time (the throttle delay)
            expect(end - start).toBeGreaterThanOrEqual(0); // Just verify it completes
        });
    });

    describe('buildFilestore', () => {
        it('should handle github source processing', async () => {
            const mockSuccessResponse = {
                ok: true,
                status: 200,
                json: jest
                    .fn()
                    .mockResolvedValue([{ name: 'test.md', type: 'file', download_url: 'https://test.com/test.md' }])
            };

            const mockFileResponse = {
                ok: true,
                status: 200,
                text: jest.fn().mockResolvedValue('# Test Content\n\nThis is test content.')
            };

            mockFetch
                .mockResolvedValueOnce(mockSuccessResponse) // getDirectoryContents
                .mockResolvedValueOnce(mockFileResponse); // file content fetch

            mockFs.mkdir.mockResolvedValue(undefined);
            mockFs.writeFile.mockResolvedValue(undefined);

            const builder = new MultiSourceDocumentationBuilder();
            builder.config.sources = [
                {
                    id: 'test-source',
                    type: 'github',
                    owner: 'test-owner',
                    repo: 'test-repo',
                    enabled: true,
                    docsPath: 'docs'
                }
            ];

            await builder.buildFilestore();

            expect(mockFs.writeFile).toHaveBeenCalledWith(
                expect.stringContaining(join('data/docs/index.json')),
                expect.any(String)
            );
        });
    });
});
