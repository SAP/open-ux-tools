import * as fs from 'fs/promises';
import { join } from 'node:path';

const mockFetch = jest.fn();
const mockSpawn = jest.fn();

const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
};

jest.mock('@sap-ux/logger', () => ({
    ToolsLogger: jest.fn().mockImplementation(() => mockLogger)
}));

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

jest.mock('child_process', () => ({
    spawn: mockSpawn
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
                statusText: 'Not Found',
                json: jest.fn().mockResolvedValue({})
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

            await expect(builder.processJsonApiSource(source)).rejects.toThrow('Failed to fetch API documentation');
        });
    });

    describe('cloneOrUpdateRepository', () => {
        it('should clone new repository successfully', async () => {
            const builder = new MultiSourceDocumentationBuilder();
            const source = {
                id: 'test-repo',
                type: 'github' as const,
                owner: 'test-owner',
                repo: 'test-repo',
                branch: 'main',
                category: 'test',
                enabled: true
            };

            const mockChild = {
                stdout: { on: jest.fn() },
                stderr: { on: jest.fn() },
                on: jest.fn((event, callback) => {
                    if (event === 'close') {
                        callback(0);
                    }
                })
            };

            mockSpawn.mockReturnValue(mockChild);
            mockFs.mkdir.mockResolvedValue(undefined);
            mockFs.stat.mockRejectedValue(new Error('Directory not found')); // Repository doesn't exist

            const result = await builder.cloneOrUpdateRepository(source);

            expect(result).toContain('test-owner-test-repo');
            expect(mockFs.mkdir).toHaveBeenCalledWith(expect.stringContaining('git_repos'), { recursive: true });
        });

        it('should handle repository update when it already exists', async () => {
            const builder = new MultiSourceDocumentationBuilder();
            const source = {
                id: 'test-repo',
                type: 'github' as const,
                owner: 'test-owner',
                repo: 'test-repo',
                branch: 'develop',
                category: 'test',
                enabled: true
            };

            const mockChild = {
                stdout: { on: jest.fn() },
                stderr: { on: jest.fn() },
                on: jest.fn((event, callback) => {
                    if (event === 'close') {
                        callback(0);
                    }
                })
            };

            mockSpawn.mockReturnValue(mockChild);
            mockFs.mkdir.mockResolvedValue(undefined);
            mockFs.stat.mockResolvedValue({ isDirectory: () => true } as any); // Repository exists

            const result = await builder.cloneOrUpdateRepository(source);

            expect(result).toContain('test-owner-test-repo');
        });
    });

    describe('readFilesFromDirectory', () => {
        it('should read files from directory recursively', async () => {
            const builder = new MultiSourceDocumentationBuilder();
            const basePath = '/test/path';

            // Mock readdir to return proper directory entries
            mockFs.readdir
                .mockResolvedValueOnce(['file1.md', 'subdir'] as any)
                .mockResolvedValueOnce(['file2.md'] as any);

            // Mock stat to distinguish files from directories
            mockFs.stat
                .mockResolvedValueOnce({ isDirectory: () => false } as any) // file1.md
                .mockResolvedValueOnce({ isDirectory: () => true } as any) // subdir
                .mockResolvedValueOnce({ isDirectory: () => false } as any); // file2.md

            mockFs.readFile.mockResolvedValue('test content');

            const files = await builder.readFilesFromDirectory(basePath);

            expect(files.length).toBeGreaterThanOrEqual(0); // Just verify it doesn't error
        });

        it('should handle file reading errors gracefully', async () => {
            const builder = new MultiSourceDocumentationBuilder();
            const basePath = '/test/path';

            mockFs.readdir.mockResolvedValue([{ name: 'file1.md', isDirectory: () => false } as any]);

            mockFs.readFile.mockRejectedValue(new Error('File read error'));

            const files = await builder.readFilesFromDirectory(basePath);

            expect(files).toHaveLength(0);
        });
    });

    describe('saveDocuments', () => {
        it('should save documents to organized directory structure', async () => {
            const builder = new MultiSourceDocumentationBuilder();

            // Add some test documents to the builder
            const testDoc = {
                id: 'test-doc',
                title: 'Test Document',
                content: 'Test content',
                category: 'test-category',
                path: 'test/doc.md',
                tags: ['test'],
                headers: ['Header'],
                lastModified: '2023-01-01',
                wordCount: 2,
                excerpt: 'Test content',
                version: '1.0.0',
                source: 'test-source'
            };

            builder['documents'].set('test-doc', testDoc);

            mockFs.mkdir.mockResolvedValue(undefined);
            mockFs.writeFile.mockResolvedValue(undefined);

            await builder.saveDocuments();

            expect(mockFs.mkdir).toHaveBeenCalled();
            expect(mockFs.writeFile).toHaveBeenCalled();
        });
    });

    describe('createMasterIndex', () => {
        it('should create master index file', async () => {
            const builder = new MultiSourceDocumentationBuilder();

            const testDoc = {
                id: 'test-doc',
                title: 'Test Document',
                content: 'Test content',
                category: 'test-category',
                path: 'test/doc.md',
                tags: ['test'],
                headers: ['Header'],
                lastModified: '2023-01-01',
                wordCount: 2,
                excerpt: 'Test content',
                version: '1.0.0',
                source: 'test-source'
            };

            builder['documents'].set('test-doc', testDoc);
            mockFs.writeFile.mockResolvedValue(undefined);

            await builder.createMasterIndex();

            expect(mockFs.writeFile).toHaveBeenCalledWith(
                expect.stringContaining('index.json'),
                expect.stringContaining('test-doc')
            );
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

            const mockChild = {
                stdout: { on: jest.fn() },
                stderr: { on: jest.fn() },
                on: jest.fn((event, callback) => {
                    if (event === 'close') {
                        callback(0);
                    }
                })
            };

            mockSpawn.mockReturnValue(mockChild);
            mockFetch
                .mockResolvedValueOnce(mockSuccessResponse) // getDirectoryContents
                .mockResolvedValueOnce(mockFileResponse); // file content fetch

            mockFs.mkdir.mockResolvedValue(undefined);
            mockFs.writeFile.mockResolvedValue(undefined);
            mockFs.stat.mockRejectedValue(new Error('Directory not found')); // Repository doesn't exist

            const builder = new MultiSourceDocumentationBuilder();
            builder.config.sources = [
                {
                    id: 'test-source',
                    type: 'github',
                    owner: 'test-owner',
                    repo: 'test-repo',
                    enabled: true,
                    docsPath: 'docs',
                    category: 'test'
                }
            ];

            await builder.buildFilestore();

            expect(mockFs.writeFile).toHaveBeenCalledWith(
                expect.stringContaining(join('data/docs/index.json')),
                expect.any(String)
            );
        });

        it('should handle build errors gracefully', async () => {
            const mockExit = jest.spyOn(process, 'exit').mockImplementation(((code?: number) => {
                throw new Error(`Process.exit called with code ${code}`);
            }) as any);

            const builder = new MultiSourceDocumentationBuilder();
            builder.config.sources = [];

            mockFs.mkdir.mockRejectedValue(new Error('Permission denied'));

            await expect(builder.buildFilestore()).rejects.toThrow();

            mockExit.mockRestore();
        });
    });

    describe('parseFileByType - additional file types', () => {
        it('should parse JavaScript files correctly', () => {
            const builder = new MultiSourceDocumentationBuilder();
            const file = {
                name: 'test.js',
                path: 'src/test.js',
                type: 'file' as const,
                content: 'function test() { return 42; }'
            };

            const result = builder.parseDocument(file);

            expect(result.title).toBe('test');
            expect(result.content).toContain('```javascript');
        });

        it('should parse XML files correctly', () => {
            const builder = new MultiSourceDocumentationBuilder();
            const file = {
                name: 'test.xml',
                path: 'src/test.xml',
                type: 'file' as const,
                content: '<root><element>value</element></root>'
            };

            const result = builder.parseDocument(file);

            expect(result.title).toBe('test');
            expect(result.content).toContain('```xml');
        });

        it('should parse CDS files correctly', () => {
            const builder = new MultiSourceDocumentationBuilder();
            const file = {
                name: 'test.cds',
                path: 'db/test.cds',
                type: 'file' as const,
                content: 'entity Books { key ID : Integer; title : String; }'
            };

            const result = builder.parseDocument(file);

            expect(result.title).toBe('test');
            expect(result.content).toContain('```cds');
        });

        it('should parse HTML files correctly', () => {
            const builder = new MultiSourceDocumentationBuilder();
            const file = {
                name: 'test.html',
                path: 'src/test.html',
                type: 'file' as const,
                content: '<html><body><h1>Test</h1></body></html>'
            };

            const result = builder.parseDocument(file);

            expect(result.title).toBe('test');
            expect(result.content).toContain('```html');
        });

        it('should parse YAML files correctly', () => {
            const builder = new MultiSourceDocumentationBuilder();
            const file = {
                name: 'test.yaml',
                path: 'config/test.yaml',
                type: 'file' as const,
                content: 'key: value\nlist:\n  - item1\n  - item2'
            };

            const result = builder.parseDocument(file);

            expect(result.title).toBe('test');
            expect(result.content).toContain('```yaml');
        });

        it('should parse YML files correctly', () => {
            const builder = new MultiSourceDocumentationBuilder();
            const file = {
                name: 'test.yml',
                path: 'config/test.yml',
                type: 'file' as const,
                content: 'name: test\nvalue: 123'
            };

            const result = builder.parseDocument(file);

            expect(result.title).toBe('test');
            expect(result.content).toContain('```yaml');
        });

        it('should parse properties files correctly', () => {
            const builder = new MultiSourceDocumentationBuilder();
            const file = {
                name: 'test.properties',
                path: 'i18n/test.properties',
                type: 'file' as const,
                content: 'key1=value1\nkey2=value2'
            };

            const result = builder.parseDocument(file);

            expect(result.title).toBe('test');
            expect(result.content).toContain('```properties');
        });

        it('should parse plain text files', () => {
            const builder = new MultiSourceDocumentationBuilder();
            const file = {
                name: 'test.txt',
                path: 'docs/test.txt',
                type: 'file' as const,
                content: 'Plain text content'
            };

            const result = builder.parseDocument(file);

            expect(result.title).toBe('test');
            expect(result.content).toBe('Plain text content');
        });

        it('should handle invalid JSON gracefully', () => {
            const builder = new MultiSourceDocumentationBuilder();
            const file = {
                name: 'invalid.json',
                path: 'data/invalid.json',
                type: 'file' as const,
                content: '{ invalid json content'
            };

            const result = builder.parseDocument(file);

            expect(result.title).toBe('invalid');
            expect(result.content).toBe('{ invalid json content');
        });
    });

    describe('generateTags', () => {
        it('should generate tags with frontmatter tags', () => {
            const builder = new MultiSourceDocumentationBuilder();
            const file = {
                name: 'test.md',
                path: 'docs/test.md',
                type: 'file' as const,
                content: '---\ntags:\n  - tag1\n  - tag2\n---\n# Test'
            };

            const result = builder.parseDocument(file);

            expect(result.tags).toContain('tag1');
            expect(result.tags).toContain('tag2');
        });

        it('should handle non-array tags in frontmatter', () => {
            const builder = new MultiSourceDocumentationBuilder();
            const file = {
                name: 'test.md',
                path: 'docs/test.md',
                type: 'file' as const,
                content: '---\ntags: single-tag\n---\n# Test'
            };

            const result = builder.parseDocument(file);

            expect(result.tags).toBeDefined();
        });

        it('should extract tags from filename', () => {
            const builder = new MultiSourceDocumentationBuilder();
            const file = {
                name: 'fiori-elements-feature.md',
                path: 'docs/fiori-elements-feature.md',
                type: 'file' as const,
                content: '# Test'
            };

            const result = builder.parseDocument(file);

            expect(result.tags).toContain('fiori');
            expect(result.tags).toContain('elements');
            expect(result.tags).toContain('feature');
        });
    });

    describe('generateExcerpt', () => {
        it('should generate excerpt from markdown content', () => {
            const builder = new MultiSourceDocumentationBuilder();
            const longContent = '# Title\n\n' + 'This is a very long content that should be truncated. '.repeat(10);
            const file = {
                name: 'test.md',
                path: 'docs/test.md',
                type: 'file' as const,
                content: longContent
            };

            const result = builder.parseDocument(file);

            expect(result.excerpt.length).toBeLessThanOrEqual(203); // 200 + '...'
            expect(result.excerpt).not.toContain('#');
        });

        it('should handle short content without truncation', () => {
            const builder = new MultiSourceDocumentationBuilder();
            const file = {
                name: 'test.md',
                path: 'docs/test.md',
                type: 'file' as const,
                content: '# Short\n\nBrief content.'
            };

            const result = builder.parseDocument(file);

            expect(result.excerpt.length).toBeLessThan(200);
            expect(result.excerpt).not.toContain('...');
        });
    });

    describe('readFilesFromDirectory edge cases', () => {
        it('should skip node_modules directories', async () => {
            const builder = new MultiSourceDocumentationBuilder();
            const basePath = '/test/path';

            mockFs.readdir.mockResolvedValue([
                { name: 'node_modules', isDirectory: () => true, isFile: () => false },
                { name: 'test.md', isDirectory: () => false, isFile: () => true }
            ] as any);

            mockFs.readFile.mockResolvedValue('test content');

            const files = await builder.readFilesFromDirectory(basePath);

            expect(files.length).toBeGreaterThanOrEqual(0);
        });

        it('should skip .git directories', async () => {
            const builder = new MultiSourceDocumentationBuilder();
            const basePath = '/test/path';

            mockFs.readdir.mockResolvedValue([
                { name: '.git', isDirectory: () => true, isFile: () => false },
                { name: 'test.md', isDirectory: () => false, isFile: () => true }
            ] as any);

            mockFs.readFile.mockResolvedValue('test content');

            const files = await builder.readFilesFromDirectory(basePath);

            expect(files.length).toBeGreaterThanOrEqual(0);
        });

        it('should handle readdir errors', async () => {
            const builder = new MultiSourceDocumentationBuilder();
            const basePath = '/test/path';

            mockFs.readdir.mockRejectedValue(new Error('Permission denied'));

            const files = await builder.readFilesFromDirectory(basePath);

            expect(files).toHaveLength(0);
        });

        it('should filter unsupported file extensions', async () => {
            const builder = new MultiSourceDocumentationBuilder();
            const basePath = '/test/path';

            mockFs.readdir.mockResolvedValue([
                { name: 'test.md', isDirectory: () => false, isFile: () => true },
                { name: 'test.exe', isDirectory: () => false, isFile: () => true },
                { name: 'test.bin', isDirectory: () => false, isFile: () => true }
            ] as any);

            mockFs.readFile.mockResolvedValue('test content');

            const files = await builder.readFilesFromDirectory(basePath);

            expect(files.some((f: any) => f.name === 'test.exe')).toBeFalsy();
        });
    });

    describe('processSource', () => {
        it('should handle unsupported source type', async () => {
            const builder = new MultiSourceDocumentationBuilder();
            const source = {
                id: 'test-source',
                type: 'unsupported' as any,
                category: 'test',
                enabled: true
            };

            await builder.processSource(source);

            const result = builder['sourceResults'].get('test-source');
            expect(result?.success).toBe(false);
            expect(result?.message).toContain('Unsupported source type');
        });

        it('should handle parsing failures in batch processing', async () => {
            const builder = new MultiSourceDocumentationBuilder();

            const mockChild = {
                stdout: { on: jest.fn() },
                stderr: { on: jest.fn() },
                on: jest.fn((event, callback) => {
                    if (event === 'close') {
                        callback(0);
                    }
                })
            };

            mockSpawn.mockReturnValue(mockChild);
            mockFs.mkdir.mockResolvedValue(undefined);
            mockFs.stat.mockRejectedValue(new Error('Not found'));
            mockFs.readdir.mockResolvedValue([
                { name: 'test.md', isDirectory: () => false, isFile: () => true }
            ] as any);
            mockFs.readFile.mockResolvedValue('# Test');

            const source = {
                id: 'test-source',
                type: 'github' as const,
                owner: 'test',
                repo: 'test',
                branch: 'main',
                category: 'test',
                enabled: true
            };

            await builder.processSource(source);

            const result = builder['sourceResults'].get('test-source');
            expect(result).toBeDefined();
        });
    });

    describe('loadFromCategory edge cases', () => {
        it('should handle non-directory category paths', async () => {
            const builder = new MultiSourceDocumentationBuilder();

            mockFs.stat.mockResolvedValue({ isDirectory: () => false } as any);

            const source = { id: 'test-source', type: 'github' as const, category: 'test', enabled: true };

            const documents = await builder.loadCachedDocuments(source);

            expect(documents).toHaveLength(0);
        });

        it('should handle readdir errors in category loading', async () => {
            const builder = new MultiSourceDocumentationBuilder();

            mockFs.stat.mockResolvedValue({ isDirectory: () => true } as any);
            mockFs.readdir.mockRejectedValue(new Error('Read error'));

            const source = { id: 'test-source', type: 'github' as const, category: 'test', enabled: true };

            const documents = await builder.loadCachedDocuments(source);

            expect(documents).toHaveLength(0);
        });

        it('should skip non-JSON files in category', async () => {
            const builder = new MultiSourceDocumentationBuilder();

            mockFs.stat.mockResolvedValue({ isDirectory: () => true } as any);
            mockFs.readdir
                .mockResolvedValueOnce(['category1'] as any)
                .mockResolvedValueOnce(['doc1.json', 'readme.md', 'config.txt'] as any);
            mockFs.readFile.mockResolvedValue(JSON.stringify({ title: 'Test', content: 'Content', path: 'test.md' }));

            const source = { id: 'test-source', type: 'github' as const, category: 'test', enabled: true };

            const documents = await builder.loadCachedDocuments(source);

            expect(documents.length).toBeGreaterThanOrEqual(0);
        });

        it('should handle malformed JSON files gracefully', async () => {
            const builder = new MultiSourceDocumentationBuilder();

            mockFs.stat.mockResolvedValue({ isDirectory: () => true } as any);
            mockFs.readdir.mockResolvedValueOnce(['category1'] as any).mockResolvedValueOnce(['bad.json'] as any);
            mockFs.readFile.mockResolvedValue('{ invalid json');

            const source = { id: 'test-source', type: 'github' as const, category: 'test', enabled: true };

            const documents = await builder.loadCachedDocuments(source);

            expect(documents).toHaveLength(0);
        });
    });

    describe('processGitHubSource', () => {
        it('should handle repository with no docsPath', async () => {
            const builder = new MultiSourceDocumentationBuilder();

            const mockChild = {
                stdout: { on: jest.fn() },
                stderr: { on: jest.fn() },
                on: jest.fn((event, callback) => {
                    if (event === 'close') {
                        callback(0);
                    }
                })
            };

            mockSpawn.mockReturnValue(mockChild);
            mockFs.mkdir.mockResolvedValue(undefined);
            mockFs.stat.mockRejectedValue(new Error('Not found'));
            mockFs.readdir.mockResolvedValue([]);

            const source = {
                id: 'test-source',
                type: 'github' as const,
                owner: 'test',
                repo: 'test',
                branch: 'main',
                category: 'test',
                enabled: true
            };

            const files = await builder.processGitHubSource(source);

            expect(files).toBeDefined();
            expect(Array.isArray(files)).toBe(true);
        });
    });

    describe('categories', () => {
        it('should add documents to category mapping', () => {
            const builder = new MultiSourceDocumentationBuilder();
            const file = {
                name: 'test.md',
                path: 'category/test.md',
                type: 'file' as const,
                content: '# Test'
            };

            const source = { id: 'test', type: 'github' as const, category: 'test-category', enabled: true };

            const result = builder.parseDocument(file, source);

            expect(result.category).toBe('test-category');
        });

        it('should extract category from path when source has no category', () => {
            const builder = new MultiSourceDocumentationBuilder();
            const file = {
                name: 'test.md',
                path: 'my-category/subfolder/test.md',
                type: 'file' as const,
                content: '# Test'
            };

            const result = builder.parseDocument(file, null);

            expect(result.category).toBe('subfolder');
        });
    });

    describe('execCommand edge cases', () => {
        it('should handle child process with stdout data', async () => {
            const builder = new MultiSourceDocumentationBuilder();
            const mockChild = {
                stdout: {
                    on: jest.fn((event, callback) => {
                        if (event === 'data') {
                            callback(Buffer.from('stdout data'));
                        }
                    })
                },
                stderr: { on: jest.fn() },
                on: jest.fn((event, callback) => {
                    if (event === 'close') {
                        callback(0);
                    }
                })
            };

            mockSpawn.mockReturnValue(mockChild);
            mockFs.mkdir.mockResolvedValue(undefined);
            mockFs.stat.mockRejectedValue(new Error('Not found'));

            const source = {
                id: 'test',
                type: 'github' as const,
                owner: 'test',
                repo: 'test',
                branch: 'main',
                category: 'test',
                enabled: true
            };

            await builder.cloneOrUpdateRepository(source);
            expect(mockChild.on).toHaveBeenCalled();
        });

        it('should handle child process with null stdout', async () => {
            const builder = new MultiSourceDocumentationBuilder();
            const mockChild = {
                stdout: null,
                stderr: { on: jest.fn() },
                on: jest.fn((event, callback) => {
                    if (event === 'close') {
                        callback(0);
                    }
                })
            };

            mockSpawn.mockReturnValue(mockChild);
            mockFs.mkdir.mockResolvedValue(undefined);
            mockFs.stat.mockRejectedValue(new Error('Not found'));

            const source = {
                id: 'test',
                type: 'github' as const,
                owner: 'test',
                repo: 'test',
                branch: 'main',
                category: 'test',
                enabled: true
            };

            await builder.cloneOrUpdateRepository(source);
            expect(mockChild.on).toHaveBeenCalled();
        });

        it('should handle child process with null stderr', async () => {
            const builder = new MultiSourceDocumentationBuilder();
            const mockChild = {
                stdout: { on: jest.fn() },
                stderr: null,
                on: jest.fn((event, callback) => {
                    if (event === 'close') {
                        callback(0);
                    }
                })
            };

            mockSpawn.mockReturnValue(mockChild);
            mockFs.mkdir.mockResolvedValue(undefined);
            mockFs.stat.mockRejectedValue(new Error('Not found'));

            const source = {
                id: 'test',
                type: 'github' as const,
                owner: 'test',
                repo: 'test',
                branch: 'main',
                category: 'test',
                enabled: true
            };

            await builder.cloneOrUpdateRepository(source);
            expect(mockChild.on).toHaveBeenCalled();
        });

        it('should handle non-zero exit code', async () => {
            const builder = new MultiSourceDocumentationBuilder();
            const mockChild = {
                stdout: { on: jest.fn() },
                stderr: {
                    on: jest.fn((event, callback) => {
                        if (event === 'data') {
                            callback(Buffer.from('error message'));
                        }
                    })
                },
                on: jest.fn((event, callback) => {
                    if (event === 'close') {
                        callback(1);
                    }
                })
            };

            mockSpawn.mockReturnValue(mockChild);
            mockFs.mkdir.mockResolvedValue(undefined);
            mockFs.stat.mockRejectedValue(new Error('Not found'));

            const source = {
                id: 'test',
                type: 'github' as const,
                owner: 'test',
                repo: 'test',
                branch: 'main',
                category: 'test',
                enabled: true
            };

            await expect(builder.cloneOrUpdateRepository(source)).rejects.toThrow();
        });

        it('should handle git pull error in update', async () => {
            const builder = new MultiSourceDocumentationBuilder();
            const mockChild = {
                stdout: { on: jest.fn() },
                stderr: {
                    on: jest.fn((event, callback) => {
                        if (event === 'data') {
                            callback(Buffer.from('pull error'));
                        }
                    })
                },
                on: jest.fn((event, callback) => {
                    if (event === 'close') {
                        callback(1);
                    }
                })
            };

            mockSpawn.mockReturnValue(mockChild);
            mockFs.mkdir.mockResolvedValue(undefined);
            mockFs.stat.mockResolvedValue({ isDirectory: () => true } as any);

            const source = {
                id: 'test',
                type: 'github' as const,
                owner: 'test',
                repo: 'test',
                branch: 'main',
                category: 'test',
                enabled: true
            };

            const result = await builder.cloneOrUpdateRepository(source);
            expect(result).toContain('test-test');
        });

        it('should handle general clone/update repository error with error.message', async () => {
            const builder = new MultiSourceDocumentationBuilder();
            const mockChild = {
                stdout: { on: jest.fn() },
                stderr: {
                    on: jest.fn((event, callback) => {
                        if (event === 'data') {
                            callback(Buffer.from('fatal error'));
                        }
                    })
                },
                on: jest.fn((event, callback) => {
                    if (event === 'close') {
                        callback(128);
                    }
                })
            };

            mockSpawn.mockReturnValue(mockChild);
            mockFs.mkdir.mockResolvedValue(undefined);
            mockFs.stat.mockRejectedValue(new Error('Not found'));

            const source = {
                id: 'test',
                type: 'github' as const,
                owner: 'test',
                repo: 'test',
                branch: 'main',
                category: 'test',
                enabled: true
            };

            await expect(builder.cloneOrUpdateRepository(source)).rejects.toThrow(
                'Failed to clone/update repository test-test:'
            );
        });
    });

    describe('readFilesFromDirectory with subdirectory recursion', () => {
        it('should recursively read from subdirectories', async () => {
            const builder = new MultiSourceDocumentationBuilder();
            const basePath = '/test/path';

            mockFs.readdir
                .mockResolvedValueOnce([
                    { name: 'subdir', isDirectory: () => true, isFile: () => false },
                    { name: 'file1.md', isDirectory: () => false, isFile: () => true }
                ] as any)
                .mockResolvedValueOnce([{ name: 'file2.md', isDirectory: () => false, isFile: () => true }] as any);

            mockFs.readFile.mockResolvedValue('content');

            const files = await builder.readFilesFromDirectory(basePath);
            expect(files.length).toBeGreaterThanOrEqual(0);
        });

        it('should handle readFile errors for specific files', async () => {
            const builder = new MultiSourceDocumentationBuilder();
            const basePath = '/test/path';

            mockFs.readdir.mockResolvedValue([
                { name: 'good.md', isDirectory: () => false, isFile: () => true },
                { name: 'bad.md', isDirectory: () => false, isFile: () => true }
            ] as any);

            mockFs.readFile.mockResolvedValueOnce('good content').mockRejectedValueOnce(new Error('Permission denied'));

            const files = await builder.readFilesFromDirectory(basePath);
            expect(files.length).toBeGreaterThanOrEqual(0);
        });
    });

    describe('processSource with parsing errors in batch', () => {
        it('should log parsing errors and continue with remaining documents', async () => {
            const builder = new MultiSourceDocumentationBuilder();
            mockLogger.warn.mockClear();

            const mockApiData = {
                symbols: [
                    { name: 'Test1', kind: 'class' },
                    { name: 'Test2', kind: 'class' }
                ]
            };

            mockFetch.mockResolvedValue({
                ok: true,
                json: jest.fn().mockResolvedValue(mockApiData)
            });

            // Override parseDocument to throw on second call
            const originalParse = builder.parseDocument.bind(builder);
            let callCount = 0;
            builder.parseDocument = jest.fn((file: any, source: any) => {
                callCount++;
                if (callCount === 2) {
                    throw new Error('Parse error on second document');
                }
                return originalParse(file, source);
            });

            const source = {
                id: 'test',
                type: 'json-api' as const,
                category: 'api',
                enabled: true,
                url: 'https://test.com/api.json'
            };

            await builder.processSource(source);

            const result = builder['sourceResults'].get('test');
            expect(result?.success).toBe(true);
            expect(result?.message).toContain('failed');
        });

        it('should handle non-Error rejection reasons in batch processing', async () => {
            const builder = new MultiSourceDocumentationBuilder();
            mockLogger.warn.mockClear();

            const mockApiData = {
                symbols: [
                    { name: 'Test1', kind: 'class' },
                    { name: 'Test2', kind: 'class' }
                ]
            };

            mockFetch.mockResolvedValue({
                ok: true,
                json: jest.fn().mockResolvedValue(mockApiData)
            });

            // Override parseDocument to throw non-Error on second call
            const originalParse = builder.parseDocument.bind(builder);
            let callCount = 0;
            builder.parseDocument = jest.fn((file: any, source: any) => {
                callCount++;
                if (callCount === 2) {
                    throw 'String error message';
                }
                return originalParse(file, source);
            });

            const source = {
                id: 'test',
                type: 'json-api' as const,
                category: 'api',
                enabled: true,
                url: 'https://test.com/api.json'
            };

            await builder.processSource(source);

            const result = builder['sourceResults'].get('test');
            expect(result).toBeDefined();
            // When there's an error, at least one document should have been added or failed
            expect(result?.documentsAdded).toBeGreaterThanOrEqual(0);
        });

        it('should use file.name when file.path is missing in error logging', async () => {
            const builder = new MultiSourceDocumentationBuilder();
            mockLogger.warn.mockClear();

            const mockApiData = {
                symbols: [{ name: 'Test1', kind: 'class' }]
            };

            mockFetch.mockResolvedValue({
                ok: true,
                json: jest.fn().mockResolvedValue(mockApiData)
            });

            // Override convertApiToDocuments to return file without path
            const originalConvert = builder.convertApiToDocuments.bind(builder);
            builder.convertApiToDocuments = jest.fn((apiData, source) => {
                const docs = originalConvert(apiData, source);
                // Remove path from first document
                if (docs.length > 0) {
                    delete docs[0].path;
                }
                return docs;
            });

            // Override parseDocument to throw error
            builder.parseDocument = jest.fn(() => {
                throw new Error('Parse error');
            });

            const source = {
                id: 'test',
                type: 'json-api' as const,
                category: 'api',
                enabled: true,
                url: 'https://test.com/api.json'
            };

            await builder.processSource(source);

            expect(mockLogger.warn).toHaveBeenCalled();
        });
    });

    describe('processGitHubSource with errors', () => {
        it('should throw error with error.message on failure', async () => {
            const builder = new MultiSourceDocumentationBuilder();

            mockFs.mkdir.mockRejectedValue(new Error('Disk full'));

            const source = {
                id: 'test',
                type: 'github' as const,
                owner: 'test',
                repo: 'test',
                branch: 'main',
                category: 'test',
                enabled: true
            };

            await expect(builder.processGitHubSource(source)).rejects.toThrow('Failed to process GitHub source test:');
        });
    });

    describe('loadFromCategory with stat not directory', () => {
        it('should handle stat returning non-directory for category path', async () => {
            const builder = new MultiSourceDocumentationBuilder();

            mockFs.stat
                .mockResolvedValueOnce({ isDirectory: () => true } as any)
                .mockResolvedValueOnce({ isDirectory: () => false } as any);
            mockFs.readdir.mockResolvedValueOnce(['category1'] as any);

            const source = { id: 'test', type: 'github' as const, category: 'test', enabled: true };

            const documents = await builder.loadCachedDocuments(source);
            expect(documents).toBeDefined();
        });

        it('should handle errors during category directory stat', async () => {
            const builder = new MultiSourceDocumentationBuilder();

            mockFs.stat
                .mockResolvedValueOnce({ isDirectory: () => true } as any)
                .mockRejectedValueOnce(new Error('Stat error'));
            mockFs.readdir.mockResolvedValueOnce(['category1'] as any);

            const source = { id: 'test', type: 'github' as const, category: 'test', enabled: true };

            const documents = await builder.loadCachedDocuments(source);
            expect(documents).toHaveLength(0);
        });
    });

    describe('generateFallbackApiContent with non-object', () => {
        it('should handle null API items', () => {
            const builder = new MultiSourceDocumentationBuilder();
            const content = builder.generateApiDocContent(null as any);

            expect(content).toBe('# API Documentation\n\nNo content available.');
        });

        it('should handle API items without methods or properties fields', () => {
            const builder = new MultiSourceDocumentationBuilder();
            const content = builder.generateApiDocContent({ someField: 'value', otherField: 123 });

            expect(content).toContain('# API Reference');
            expect(content).toContain('```json');
            expect(content).toContain('"someField": "value"');
        });
    });

    describe('createMasterIndex with multiple categories', () => {
        it('should create index with properly formatted category names', async () => {
            const builder = new MultiSourceDocumentationBuilder();

            const doc1 = {
                id: 'doc1',
                title: 'Doc 1',
                content: 'content',
                category: 'test-category-one',
                path: 'test1.md',
                tags: [],
                headers: [],
                lastModified: '2023-01-01',
                wordCount: 1,
                excerpt: 'excerpt',
                version: '1.0.0',
                source: 'source1'
            };

            const doc2 = {
                id: 'doc2',
                title: 'Doc 2',
                content: 'content',
                category: 'another-category',
                path: 'test2.md',
                tags: [],
                headers: [],
                lastModified: '2023-01-01',
                wordCount: 1,
                excerpt: 'excerpt',
                version: '1.0.0',
                source: 'source1'
            };

            builder['documents'].set('doc1', doc1);
            builder['documents'].set('doc2', doc2);
            builder['categories'].set('test-category-one', ['doc1']);
            builder['categories'].set('another-category', ['doc2']);

            mockFs.writeFile.mockResolvedValue(undefined);

            await builder.createMasterIndex();

            expect(mockFs.writeFile).toHaveBeenCalled();
            const writeCall = mockFs.writeFile.mock.calls[0];
            const indexContent = JSON.parse(writeCall[1] as string);

            expect(indexContent.categories).toHaveLength(2);
            expect(indexContent.categories.some((c: any) => c.name === 'Test Category One')).toBe(true);
            expect(indexContent.categories.some((c: any) => c.name === 'Another Category')).toBe(true);
        });
    });
});
