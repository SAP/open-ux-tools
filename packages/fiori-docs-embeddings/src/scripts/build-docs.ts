#!/usr/bin/env node

import fetch from 'node-fetch';
import { marked } from 'marked';
import matter from 'gray-matter';
import fs from 'fs/promises';
import path from 'path';

interface SourceConfig {
    id: string;
    type: 'github' | 'json-api';
    owner?: string;
    repo?: string;
    branch?: string;
    docsPath?: string;
    url?: string;
    category: string;
    enabled: boolean;
}

interface BuildConfig {
    outputPath: string;
    sources: SourceConfig[];
}

interface FileContent {
    name: string;
    path: string;
    content: string;
    download_url?: string;
}

interface GitHubFile {
    name: string;
    path: string;
    type: 'file' | 'dir';
    content?: string;
    encoding?: string;
}

interface ParsedDocument {
    id: string;
    title: string;
    category: string;
    path: string;
    lastModified: string;
    tags: string[];
    headers: string[];
    content: string;
    excerpt: string;
    wordCount: number;
    version: string;
    source?: string;
    sourceType?: string;
}

interface SourceResult {
    success: boolean;
    documentsAdded: number;
    message: string;
    startTime: number;
}

interface Token {
    type: string;
    text: string;
}

interface MatterResult {
    data: Record<string, any>;
    content: string;
}

class MultiSourceDocumentationBuilder {
    private config: BuildConfig & { owner?: string; repo?: string; branch?: string; docsPath?: string };
    private baseUrl: string;
    private requestCount: number;
    private documents: Map<string, ParsedDocument>;
    private categories: Map<string, string[]>;
    private sourceResults: Map<string, SourceResult>;

    constructor() {
        this.config = {
            outputPath: './data/docs',
            sources: [
                {
                    id: 'btp-fiori-tools',
                    type: 'github',
                    owner: 'SAP-docs',
                    repo: 'btp-fiori-tools',
                    branch: 'main',
                    docsPath: 'docs',
                    category: 'fiori-tools',
                    enabled: true
                },
                {
                    id: 'sapui5',
                    type: 'github',
                    owner: 'SAP-docs',
                    repo: 'sapui5',
                    branch: 'main',
                    docsPath: 'docs',
                    category: 'ui5-framework',
                    enabled: true
                },
                {
                    id: 'fiori-samples',
                    type: 'github',
                    owner: 'SAP-samples',
                    repo: 'fiori-tools-samples',
                    branch: 'main',
                    docsPath: '',
                    category: 'samples',
                    enabled: true
                },
                {
                    id: 'fiori-showcase',
                    type: 'github',
                    owner: 'SAP-samples',
                    repo: 'fiori-elements-feature-showcase',
                    branch: 'main',
                    docsPath: '',
                    category: 'features',
                    enabled: true
                },
                {
                    id: 'ui5-api',
                    type: 'json-api',
                    url: 'https://ui5.sap.com/test-resources/sap/fe/macros/designtime/apiref/api.json',
                    category: 'api-reference',
                    enabled: true
                }
            ]
        };
        this.baseUrl = 'https://api.github.com';
        this.requestCount = 0;
        this.documents = new Map();
        this.categories = new Map();
        this.sourceResults = new Map();
    }

    async getHeaders(): Promise<Record<string, string>> {
        const headers: Record<string, string> = {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'sap-fiori-docs-builder/1.0.0'
        };

        if (process.env.GITHUB_TOKEN) {
            headers.Authorization = `token ${process.env.GITHUB_TOKEN}`;
        }

        return headers;
    }

    async throttleRequest(): Promise<void> {
        // Reduced delay for better performance - GitHub allows ~5000 requests/hour
        if (this.requestCount > 0 && this.requestCount % 10 === 0) {
            await new Promise((resolve) => setTimeout(resolve, 100));
        }
        this.requestCount++;
    }

    async fetchWithRetry(url: string, maxRetries: number = 3): Promise<any> {
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                await this.throttleRequest();

                const response = await fetch(url, {
                    headers: await this.getHeaders()
                });

                if (!response.ok) {
                    if (response.status === 403 && attempt < maxRetries) {
                        const resetTime = response.headers.get('x-ratelimit-reset');
                        if (resetTime) {
                            const waitTime = parseInt(resetTime, 10) * 1000 - Date.now();
                            if (waitTime > 0 && waitTime < 3600000) {
                                // Wait max 1 hour
                                console.log(`Rate limited. Waiting ${Math.round(waitTime / 1000)}s...`);
                                await new Promise((resolve) => setTimeout(resolve, waitTime));
                                continue;
                            }
                        }
                        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
                    }
                    throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
                }

                return await response.json();
            } catch (error) {
                if (attempt === maxRetries) {
                    throw error;
                }
                console.warn(`Request failed (attempt ${attempt + 1}), retrying...`);
                await new Promise((resolve) => setTimeout(resolve, 2000 * Math.pow(2, attempt)));
            }
        }
    }

    async getDirectoryContents(path: string = ''): Promise<GitHubFile[]> {
        const url = `${this.baseUrl}/repos/${this.config.owner}/${this.config.repo}/contents/${path}`;
        return await this.fetchWithRetry(url);
    }

    async getFileContent(path: string): Promise<GitHubFile> {
        const url = `${this.baseUrl}/repos/${this.config.owner}/${this.config.repo}/contents/${path}`;
        const file = await this.fetchWithRetry(url);

        if (file.content && file.encoding === 'base64') {
            file.content = Buffer.from(file.content, 'base64').toString('utf-8');
        }

        return file;
    }

    parseDocument(file: GitHubFile, source: SourceConfig | null = null): ParsedDocument {
        if (!file.content) {
            throw new Error(`No content found for file: ${file.path}`);
        }

        const fileExtension = path.extname(file.path).toLowerCase();
        let parsed: MatterResult,
            tokens: Token[] = [],
            headers: string[] = [],
            title: string,
            content: string;

        // Handle different file types
        if (fileExtension === '.md') {
            parsed = matter(file.content);
            tokens = marked.lexer(parsed.content) as Token[];
            content = file.content;

            // Extract headers from markdown
            headers = tokens.filter((token) => token.type === 'heading').map((token) => token.text);

            // Extract title
            title = parsed.data.title || headers[0] || file.name.replace(/\.md$/, '').replace(/[-_]/g, ' ');
        } else if (fileExtension === '.json') {
            try {
                const jsonContent = JSON.parse(file.content);
                content = `# ${file.name}\n\n\`\`\`json\n${JSON.stringify(jsonContent, null, 2)}\n\`\`\``;
                title =
                    jsonContent.name || jsonContent.title || file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
                headers = Object.keys(jsonContent).slice(0, 10); // Top-level keys as headers
                parsed = { data: {}, content: content };
            } catch (error) {
                // Treat as plain text if JSON parsing fails
                content = file.content;
                title = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
                parsed = { data: {}, content: content };
            }
        } else if (['.ts', '.js', '.xml', '.cds', '.html', '.properties', '.yaml', '.yml'].includes(fileExtension)) {
            // For code files, wrap in code blocks
            const language: Record<string, string> = {
                '.ts': 'typescript',
                '.js': 'javascript',
                '.xml': 'xml',
                '.cds': 'cds',
                '.html': 'html',
                '.properties': 'properties',
                '.yaml': 'yaml',
                '.yml': 'yaml'
            };

            content = `# ${file.name}\n\n\`\`\`${language[fileExtension] || 'text'}\n${file.content}\n\`\`\``;
            title = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');

            // Extract function names, class names, etc. as headers for code files
            if (['.ts', '.js'].includes(fileExtension)) {
                const functionMatches = file.content.match(/(?:function\s+|class\s+|interface\s+|type\s+)(\w+)/g) || [];
                headers = functionMatches.map((match) => match.split(/\s+/).pop()!).slice(0, 10);
            }

            parsed = { data: {}, content: content };
        } else {
            // Default: treat as plain text
            content = file.content;
            title = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
            parsed = { data: {}, content: content };
        }

        // Extract category from path or use source category
        let category: string;
        if (source && source.category) {
            category = source.category;
        } else {
            const pathParts = file.path.split('/');
            category = pathParts.length > 1 ? pathParts[pathParts.length - 2] : 'docs';
        }

        // Extract tags
        const tags = [
            ...(parsed.data.tags || []),
            category,
            fileExtension.replace('.', ''),
            ...file.name.split(/[-_]/).filter((word) => word.length > 2)
        ].filter((tag, index, arr) => arr.indexOf(tag) === index);

        // Generate excerpt
        let plainText: string;
        if (fileExtension === '.md') {
            plainText = parsed.content
                .replace(/#{1,6}\s+/g, '')
                .replace(/\*\*(.*?)\*\*/g, '$1')
                .replace(/\*(.*?)\*/g, '$1')
                .replace(/`(.*?)`/g, '$1')
                .replace(/\[(.*?)\]\(.*?\)/g, '$1')
                .replace(/\n+/g, ' ')
                .trim();
        } else {
            plainText = content
                .replace(/```[\s\S]*?```/g, '')
                .replace(/#{1,6}\s+/g, '')
                .replace(/\n+/g, ' ')
                .trim();
        }

        const excerpt = plainText.length > 200 ? plainText.substring(0, 200) + '...' : plainText;

        // Generate ID
        const id = file.path.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();

        return {
            id,
            title,
            category: this.normalizeCategory(category),
            path: file.path,
            lastModified: new Date().toISOString(),
            tags,
            headers,
            content: content,
            excerpt,
            wordCount: content.split(/\s+/).length,
            version: '1.0.0'
        };
    }

    normalizeCategory(category: string): string {
        return category
            .toLowerCase()
            .replace(/[^a-zA-Z0-9]/g, '-')
            .replace(/^-+|-+$/g, '')
            .replace(/-+/g, '-');
    }

    async getAllMarkdownFiles(basePath: string = ''): Promise<GitHubFile[]> {
        const files: GitHubFile[] = [];
        const path = basePath || this.config.docsPath || '';

        try {
            console.log(`Fetching directory contents for: ${path}`);
            const contents = await this.getDirectoryContents(path);
            console.log(`Found ${contents.length} items in ${path}`);

            const supportedExtensions = [
                '.md',
                '.ts',
                '.js',
                '.xml',
                '.cds',
                '.json',
                '.html',
                '.properties',
                '.yaml',
                '.yml'
            ];

            // Separate files and directories for parallel processing
            const fileItems = contents.filter(
                (item) => item.type === 'file' && supportedExtensions.some((ext) => item.name.endsWith(ext))
            );
            const dirItems = contents.filter((item) => item.type === 'dir');

            // Process files in parallel batches
            const batchSize = 10; // Process 10 files concurrently
            const fileResults: (GitHubFile | null)[] = [];

            for (let i = 0; i < fileItems.length; i += batchSize) {
                const batch = fileItems.slice(i, i + batchSize);

                const batchPromises = batch.map(async (item) => {
                    try {
                        const file = await this.getFileContent(item.path);
                        return file;
                    } catch (error: any) {
                        console.warn(`✗ Failed to fetch file ${item.path}:`, error.message);
                        return null;
                    }
                });

                const batchResults = await Promise.all(batchPromises);
                fileResults.push(...batchResults);

                console.log(
                    `✓ Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(fileItems.length / batchSize)} (${
                        batch.length
                    } files)`
                );
            }

            // Process directories in parallel batches to handle deep nesting
            const allDirResults: GitHubFile[][] = [];
            const dirBatchSize = 3; // Process fewer directories at once to avoid rate limits

            console.log(`🗂️  Processing ${dirItems.length} directories in batches of ${dirBatchSize}...`);

            for (let i = 0; i < dirItems.length; i += dirBatchSize) {
                const batch = dirItems.slice(i, i + dirBatchSize);
                
                const batchPromises = batch.map(async (item) => {
                    try {
                        console.log(`📁 Processing directory: ${item.path}`);
                        const subFiles = await this.getAllMarkdownFiles(item.path);
                        console.log(`✓ Found ${subFiles.length} files in ${item.path}`);
                        return subFiles;
                    } catch (error: any) {
                        console.warn(`Failed to fetch directory ${item.path}:`, error.message);
                        return [];
                    }
                });

                const batchResults = await Promise.all(batchPromises);
                allDirResults.push(...batchResults);

                console.log(`✓ Completed directory batch ${Math.floor(i / dirBatchSize) + 1}/${Math.ceil(dirItems.length / dirBatchSize)}`);
            }

            const dirResults = allDirResults;

            // Add successful file results
            fileResults.forEach((file) => {
                if (file) {
                    files.push(file);
                }
            });

            // Add directory results
            dirResults.forEach((subFiles) => {
                files.push(...subFiles);
            });

            console.log(`✓ Successfully fetched ${files.length} files from ${path}`);
        } catch (error: any) {
            console.error(`Failed to fetch directory contents for ${path}:`, error.message);
            throw error;
        }

        return files;
    }

    async buildFilestore(): Promise<void> {
        console.log('🚀 Starting multi-source documentation build...');

        try {
            // Ensure output directory exists
            await fs.mkdir(this.config.outputPath, { recursive: true });

            // Process sources in parallel (but limit concurrency to avoid rate limits)
            const enabledSources = this.config.sources.filter((source) => source.enabled);
            console.log(`📚 Processing ${enabledSources.length} enabled sources in parallel...`);

            const concurrentSources = 2; // Process 2 sources at once to balance speed vs rate limits
            for (let i = 0; i < enabledSources.length; i += concurrentSources) {
                const batch = enabledSources.slice(i, i + concurrentSources);

                await Promise.all(
                    batch.map(async (source) => {
                        console.log(`🔄 Starting source: ${source.id}`);
                        await this.processSource(source);
                    })
                );

                console.log(
                    `✅ Completed batch ${Math.floor(i / concurrentSources) + 1}/${Math.ceil(
                        enabledSources.length / concurrentSources
                    )}`
                );
            }

            console.log(`\n📊 Multi-source build summary:`);
            for (const [sourceId, result] of this.sourceResults.entries()) {
                const status = result.success ? '✅' : '❌';
                console.log(`${status} ${sourceId}: ${result.documentsAdded} docs (${result.message})`);
            }

            // Save individual document files
            await this.saveDocuments();

            // Create master index
            await this.createMasterIndex();

            // Create search indexes
            await this.createSearchIndexes();

            console.log(`\n🎉 Multi-source documentation build completed!`);
            console.log(`📊 Total documents: ${this.documents.size}`);
            console.log(`📁 Categories: ${this.categories.size}`);
            console.log(`🌐 GitHub API requests: ${this.requestCount}`);
            console.log(`🔗 Sources processed: ${this.sourceResults.size}`);
        } catch (error: any) {
            console.error('❌ Build failed:', error.message);
            process.exit(1);
        }
    }

    async processSource(source: SourceConfig): Promise<void> {
        console.log(`\n📚 Processing source: ${source.id} (${source.type})`);

        const result: SourceResult = {
            success: false,
            documentsAdded: 0,
            message: '',
            startTime: Date.now()
        };

        try {
            let files: FileContent[] = [];

            switch (source.type) {
                case 'github':
                    files = await this.processGitHubSource(source);
                    break;
                case 'json-api':
                    files = await this.processJsonApiSource(source);
                    break;
                default:
                    throw new Error(`Unsupported source type: ${source.type}`);
            }

            console.log(`📄 Found ${files.length} files from ${source.id}`);

            let successCount = 0;
            let failureCount = 0;

            // Process files in parallel batches for parsing
            const parseBatchSize = 20;
            for (let i = 0; i < files.length; i += parseBatchSize) {
                const batch = files.slice(i, i + parseBatchSize);

                const parseResults = await Promise.allSettled(
                    batch.map(async (file) => {
                        const doc = this.parseDocument(file as GitHubFile, source);

                        // Ensure unique document IDs across sources
                        const docId = `${source.id}-${doc.id}`;
                        doc.id = docId;
                        doc.source = source.id;
                        doc.sourceType = source.type;

                        return { docId, doc };
                    })
                );

                // Process results
                parseResults.forEach((result, index) => {
                    if (result.status === 'fulfilled') {
                        const { docId, doc } = result.value;
                        this.documents.set(docId, doc);

                        // Add to category mapping
                        if (!this.categories.has(doc.category)) {
                            this.categories.set(doc.category, []);
                        }
                        this.categories.get(doc.category)!.push(docId);

                        successCount++;
                    } else {
                        const file = batch[index];
                        console.warn(
                            `Failed to parse document ${file.path || file.name}:`,
                            result.reason?.message || result.reason
                        );
                        failureCount++;
                    }
                });

                // Progress update
                const processed = Math.min(i + parseBatchSize, files.length);
                console.log(`  📝 Parsed ${processed}/${files.length} files from ${source.id}`);
            }

            result.success = true;
            result.documentsAdded = successCount;
            result.message = `${successCount} docs added, ${failureCount} failed`;

            const duration = Date.now() - result.startTime;
            console.log(`✅ ${source.id} completed in ${duration}ms: ${result.message}`);
        } catch (error: any) {
            result.success = false;
            result.message = error.message;
            console.error(`❌ Failed to process source ${source.id}:`, error.message);

            // Continue with other sources instead of failing completely
        }

        this.sourceResults.set(source.id, result);
    }

    async processGitHubSource(source: SourceConfig): Promise<FileContent[]> {
        // Check if we can use cached documents first to avoid rate limits
        try {
            const cachedDocs = await this.loadCachedDocuments(source);
            if (cachedDocs.length > 0) {
                console.log(`Using ${cachedDocs.length} cached documents for ${source.id}`);
                return cachedDocs;
            }
        } catch (error) {
            console.log(`No cached documents found for ${source.id}, fetching from GitHub...`);
        }

        // Temporarily set config for legacy method compatibility
        const oldConfig = { ...this.config };
        this.config.owner = source.owner;
        this.config.repo = source.repo;
        this.config.branch = source.branch;
        this.config.docsPath = source.docsPath;

        try {
            const files = await this.getAllMarkdownFiles();
            this.config = oldConfig; // Restore config
            return files as FileContent[];
        } catch (error) {
            this.config = oldConfig; // Restore config on error
            throw error;
        }
    }

    async loadCachedDocuments(source: SourceConfig): Promise<FileContent[]> {
        // Check both old flat structure and new source-based structure
        const files: FileContent[] = [];

        // Try new source-based structure first
        try {
            const sourceDir = path.join(this.config.outputPath, source.id);
            const sourceStat = await fs.stat(sourceDir);

            if (sourceStat.isDirectory()) {
                const categories = await fs.readdir(sourceDir);

                for (const category of categories) {
                    try {
                        const categoryPath = path.join(sourceDir, category);
                        const categoryStat = await fs.stat(categoryPath);

                        if (categoryStat.isDirectory()) {
                            const categoryFiles = await fs.readdir(categoryPath);

                            for (const file of categoryFiles) {
                                if (file.endsWith('.json')) {
                                    const filePath = path.join(categoryPath, file);
                                    const docData = JSON.parse(await fs.readFile(filePath, 'utf-8'));

                                    files.push({
                                        name: `${docData.title}.md`,
                                        path: docData.path,
                                        content: docData.content,
                                        download_url: 'cached'
                                    });
                                }
                            }
                        }
                    } catch (error) {
                        // Category doesn't exist, skip
                    }
                }

                return files;
            }
        } catch (error) {
            // Source directory doesn't exist, try old structure
        }

        // Fallback to old flat structure for btp-fiori-tools
        if (source.id === 'btp-fiori-tools') {
            const categories = [
                'deploying-an-application',
                'developing-an-application',
                'docs',
                'generating-an-application',
                'getting-started-with-sap-fiori-tools',
                'previewing-an-application',
                'project-functions',
                'sap-fiori-elements',
                'sapui5-freestyle',
                'additional-configuration'
            ];

            for (const category of categories) {
                try {
                    const categoryPath = path.join(this.config.outputPath, category);
                    const categoryFiles = await fs.readdir(categoryPath);

                    for (const file of categoryFiles) {
                        if (file.endsWith('.json')) {
                            const filePath = path.join(categoryPath, file);
                            const docData = JSON.parse(await fs.readFile(filePath, 'utf-8'));

                            files.push({
                                name: `${docData.title}.md`,
                                path: docData.path,
                                content: docData.content,
                                download_url: 'cached'
                            });
                        }
                    }
                } catch (error) {
                    // Category doesn't exist, skip
                }
            }
        }

        return files;
    }

    async processJsonApiSource(source: SourceConfig): Promise<FileContent[]> {
        console.log(`Fetching API documentation from: ${source.url}`);

        try {
            const response = await fetch(source.url!);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const apiData = await response.json();
            return this.convertApiToDocuments(apiData, source);
        } catch (error: any) {
            throw new Error(`Failed to fetch API documentation: ${error.message}`);
        }
    }

    convertApiToDocuments(apiData: any, source: SourceConfig): FileContent[] {
        const documents: FileContent[] = [];

        // Handle different API structures
        if (apiData.symbols) {
            // UI5 API format
            for (const symbol of apiData.symbols) {
                if (symbol.kind === 'class' || symbol.kind === 'namespace') {
                    documents.push({
                        name: `${symbol.name}.md`,
                        path: `api/${symbol.name}.md`,
                        content: this.generateApiDocContent(symbol),
                        download_url: source.url
                    });
                }
            }
        } else if (Array.isArray(apiData)) {
            // Array of API items
            apiData.forEach((item: any, index: number) => {
                documents.push({
                    name: `api-item-${index}.md`,
                    path: `api/item-${index}.md`,
                    content: this.generateApiDocContent(item),
                    download_url: source.url
                });
            });
        } else {
            // Single API object
            documents.push({
                name: 'api-reference.md',
                path: 'api/reference.md',
                content: this.generateApiDocContent(apiData),
                download_url: source.url
            });
        }

        console.log(`Generated ${documents.length} API documents`);
        return documents;
    }

    generateApiDocContent(apiItem: any): string {
        let content = '';

        if (apiItem.name) {
            content += `# ${apiItem.name}\n\n`;
        }

        if (apiItem.description) {
            content += `${apiItem.description}\n\n`;
        }

        if (apiItem.kind) {
            content += `**Type:** ${apiItem.kind}\n\n`;
        }

        if (apiItem.module) {
            content += `**Module:** ${apiItem.module}\n\n`;
        }

        if (apiItem.methods) {
            content += `## Methods\n\n`;
            for (const method of apiItem.methods) {
                content += `### ${method.name}\n`;
                if (method.description) {
                    content += `${method.description}\n\n`;
                }
            }
        }

        if (apiItem.properties) {
            content += `## Properties\n\n`;
            for (const prop of apiItem.properties) {
                content += `### ${prop.name}\n`;
                if (prop.description) {
                    content += `${prop.description}\n\n`;
                }
            }
        }

        // Convert object to readable content if no specific structure
        if (!content && typeof apiItem === 'object') {
            content = `# API Reference\n\n\`\`\`json\n${JSON.stringify(apiItem, null, 2)}\n\`\`\`\n`;
        }

        return content || '# API Documentation\n\nNo content available.';
    }

    async saveDocuments(): Promise<void> {
        console.log('\n💾 Saving document files organized by source...');

        for (const [docId, doc] of this.documents) {
            // Organize by source first, then by category within source
            const sourceDir = path.join(this.config.outputPath, doc.source || 'unknown');
            const categoryDir = path.join(sourceDir, doc.category);
            await fs.mkdir(categoryDir, { recursive: true });

            const filePath = path.join(categoryDir, `${docId.replace(`${doc.source}-`, '')}.json`);
            await fs.writeFile(filePath, JSON.stringify(doc, null, 2));
        }

        console.log(`✓ Saved ${this.documents.size} document files organized by source`);
    }

    async createMasterIndex(): Promise<void> {
        console.log('\n📋 Creating master index...');

        const categories = Array.from(this.categories.entries()).map(([id, docIds]) => {
            const categoryName = id
                .split('-')
                .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');

            return {
                id,
                name: categoryName,
                count: docIds.length,
                documents: docIds
            };
        });

        const documentPaths: Record<string, string> = {};
        for (const [docId, doc] of this.documents) {
            const cleanDocId = docId.replace(`${doc.source}-`, '');
            documentPaths[docId] = `${doc.source}/${doc.category}/${cleanDocId}.json`;
        }

        const index = {
            version: '1.0.0',
            generatedAt: new Date().toISOString(),
            totalDocuments: this.documents.size,
            categories,
            documents: documentPaths
        };

        const indexPath = path.join(this.config.outputPath, 'index.json');
        await fs.writeFile(indexPath, JSON.stringify(index, null, 2));

        console.log(`✓ Created master index: ${indexPath}`);
    }

    async createSearchIndexes(): Promise<void> {
        console.log('\n🔍 Creating search indexes...');

        const searchDir = path.join('./data/search');
        await fs.mkdir(searchDir, { recursive: true });

        // Create keyword index
        const keywords = new Map<string, string[]>();
        for (const doc of this.documents.values()) {
            const allText = [doc.title, ...doc.headers, ...doc.tags, doc.content].join(' ').toLowerCase();
            const words = allText.match(/\b\w{3,}\b/g) || [];

            for (const word of words) {
                if (!keywords.has(word)) {
                    keywords.set(word, []);
                }
                if (!keywords.get(word)!.includes(doc.id)) {
                    keywords.get(word)!.push(doc.id);
                }
            }
        }

        const keywordIndex = Object.fromEntries(keywords);
        await fs.writeFile(path.join(searchDir, 'keywords.json'), JSON.stringify(keywordIndex, null, 2));

        // Create category index
        const categoryIndex = Object.fromEntries(this.categories);
        await fs.writeFile(path.join(searchDir, 'categories.json'), JSON.stringify(categoryIndex, null, 2));

        console.log(`✓ Created search indexes`);
    }
}

// Run the builder
if (import.meta.url === `file://${process.argv[1]}`) {
    const builder = new MultiSourceDocumentationBuilder();
    builder.buildFilestore().catch((error) => {
        console.error('Build failed:', error);
        process.exit(1);
    });
}
