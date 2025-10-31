#!/usr/bin/env node

import fetch from 'node-fetch';
import { marked } from 'marked';
import * as fs from 'fs/promises';
import * as path from 'node:path';
import { spawn, type SpawnOptionsWithoutStdio } from 'node:child_process';
import { default as matter } from 'gray-matter';
import { ToolsLogger, type Logger } from '@sap-ux/logger';
import { setTimeout } from 'node:timers/promises';

// Create promisified version of spawn for async/await
const execCommand = (
    command: string,
    args: string[],
    options: SpawnOptionsWithoutStdio
): Promise<{ stdout: string; stderr: string }> => {
    return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
        const child = spawn(command, args, { ...options, stdio: ['pipe', 'pipe', 'pipe'] });
        let stdout = '';
        let stderr = '';

        child.stdout?.on('data', (data) => {
            stdout += data.toString();
        });

        child.stderr?.on('data', (data) => {
            stderr += data.toString();
        });

        child.on('close', (code) => {
            if (code === 0) {
                resolve({ stdout, stderr });
            } else {
                reject(new Error(`Command failed with exit code ${code}: ${stderr}`));
            }
        });
    });
};

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
    gitReposPath?: string;
    sources: SourceConfig[];
}

interface LLMClient {
    /**
     *
     */
    send(payload: LLMPayload): Promise<LLMResponse>;
}

interface LLMPayload {
    deployment_id: string;
    messages: Array<{ role: string; content: string }>;
}

interface LLMResponse {
    choices: Array<{
        message: {
            content: string;
        };
    }>;
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
    data: Record<string, unknown>;
    content: string;
}

interface ApiSymbol {
    name?: string;
    kind?: string;
    description?: string;
    module?: string;
    methods?: ApiMethod[];
    properties?: ApiProperty[];
}

interface ApiMethod {
    name: string;
    description?: string;
}

interface ApiProperty {
    name: string;
    description?: string;
}

type ApiData = {
    symbols: ApiSymbol[];
} & Record<string, unknown>;

interface AICoreCredentials {
    url: string;
    clientid: string;
    clientsecret: string;
    serviceurls: {
        AI_API_URL: string;
    };
}

interface TokenResponse {
    access_token: string;
}

interface Configuration {
    id: string;
    name: string;
}

interface ConfigurationsResponse {
    resources: Configuration[];
}

interface Deployment {
    id: string;
    configurationId: string;
    status: string;
    deploymentUrl: string;
}

interface DeploymentsResponse {
    resources: Deployment[];
}

/**
 * HTTP AI Core LLM Client
 */
class HTTPAICoreClient implements LLMClient {
    private credentials?: AICoreCredentials;
    private token?: string;
    private deploymentUrl: Record<string, string> = {};

    /**
     * Sends a payload to the LLM service.
     *
     * @param payload - The LLM payload to send
     * @returns The LLM response
     */
    async send(payload: LLMPayload): Promise<LLMResponse> {
        if (!this.credentials) {
            try {
                this.credentials = JSON.parse(process.env.AI_CORE_SERVICE_KEY || '');
            } catch {
                throw new Error('You need to provide the service key in environment variable AI_CORE_SERVICE_KEY');
            }
        }

        if (!this.token && this.credentials) {
            const resp = await fetch(this.credentials.url + '/oauth/token?grant_type=client_credentials', {
                method: 'POST',
                headers: {
                    Authorization: `Basic ${Buffer.from(
                        this.credentials.clientid + ':' + this.credentials.clientsecret
                    ).toString('base64')}`
                }
            });
            const tokenData = (await resp.json()) as TokenResponse;
            this.token = tokenData.access_token;
        }

        if (!this.deploymentUrl[payload.deployment_id] && this.credentials) {
            const configurations = await fetch(this.credentials.serviceurls.AI_API_URL + '/v2/lm/configurations', {
                headers: {
                    Authorization: `Bearer ${this.token}`,
                    'AI-Resource-Group': 'default'
                }
            });
            const configurationsData = (await configurations.json()) as ConfigurationsResponse;

            const configName = 'embeddingsscript-' + payload.deployment_id;
            const config = configurationsData.resources.find((r) => r.name === configName);
            let configurationId;

            if (config) {
                configurationId = config.id;
            } else {
                const postConfig = await fetch(this.credentials.serviceurls.AI_API_URL + '/v2/lm/configurations', {
                    method: 'POST',
                    body: JSON.stringify({
                        name: configName,
                        executableId: 'azure-openai',
                        scenarioId: 'foundation-models',
                        parameterBindings: [{ key: 'modelName', value: payload.deployment_id }]
                    }),
                    headers: {
                        Authorization: `Bearer ${this.token}`,
                        'AI-Resource-Group': 'default',
                        'content-type': 'application/json'
                    }
                });
                const postConfigData = (await postConfig.json()) as Configuration;
                configurationId = postConfigData.id;
            }

            const deployments = await fetch(this.credentials.serviceurls.AI_API_URL + '/v2/lm/deployments', {
                headers: {
                    Authorization: `Bearer ${this.token}`,
                    'AI-Resource-Group': 'default'
                }
            });
            const deploymentsData = (await deployments.json()) as DeploymentsResponse;

            const deployment = deploymentsData.resources.find((r) => r.configurationId === configurationId);

            if (!deployment) {
                await fetch(this.credentials.serviceurls.AI_API_URL + '/v2/lm/deployments', {
                    method: 'POST',
                    body: JSON.stringify({ configurationId }),
                    headers: {
                        Authorization: `Bearer ${this.token}`,
                        'AI-Resource-Group': 'default',
                        'content-type': 'application/json'
                    }
                });
                throw new Error(
                    'Deployment created, please run again in a few minutes.\nReason: The AI Core Service needs a deployment to query LLMs, the deployment was created but it takes a few minutes to complete.'
                );
            }

            if (deployment.status !== 'RUNNING') {
                throw new Error('Deployment not ready, please run again in a few minutes');
            }
            this.deploymentUrl[payload.deployment_id] = deployment.deploymentUrl;
        }

        const res = await fetch(
            this.deploymentUrl[payload.deployment_id] + '/chat/completions?api-version=2023-05-15',
            {
                method: 'POST',
                body: JSON.stringify({ messages: payload.messages }),
                headers: {
                    Authorization: `Bearer ${this.token}`,
                    'AI-Resource-Group': 'default',
                    'content-type': 'application/json'
                }
            }
        );
        return (await res.json()) as LLMResponse;
    }
}

/**
 * LLM wrapper
 */
class LLM {
    private readonly client: LLMClient;

    constructor() {
        this.client = new HTTPAICoreClient();
    }

    /**
     * Sends a payload to the LLM client with error handling.
     *
     * @param payload - The LLM payload to send
     * @returns The LLM response
     */
    async send(payload: LLMPayload): Promise<LLMResponse> {
        try {
            return await this.client.send(payload);
        } catch (e: unknown) {
            const error = e as Error & { body?: { data?: { error?: string }; error?: string } };
            const err = new Error(error.body?.data?.error || error.body?.error || error.message || String(e));
            (err as Error & { code: string }).code = 'LLM';
            throw err;
        }
    }
}

/**
 * Multi-source documentation builder for fetching and processing documentation from various sources.
 */
class MultiSourceDocumentationBuilder {
    private readonly config: BuildConfig;
    private readonly requestCount: number;
    private readonly documents: Map<string, ParsedDocument>;
    private readonly categories: Map<string, string[]>;
    private readonly sourceResults: Map<string, SourceResult>;
    private readonly gitReposPath: string;
    private readonly logger: Logger;
    private readonly llm: LLM;
    private readonly sourceMarkdown: Map<string, string[]>;

    constructor() {
        this.config = {
            outputPath: './data_local',
            gitReposPath: './data/git_repos',
            sources: [
                {
                    id: 'btp-fiori-tools',
                    type: 'github',
                    owner: 'SAP-docs',
                    repo: 'btp-fiori-tools',
                    branch: 'main',
                    docsPath: 'docs',
                    category: 'fiori-tools',
                    enabled: false
                },
                {
                    id: 'sapui5',
                    type: 'github',
                    owner: 'SAP-docs',
                    repo: 'sapui5',
                    branch: 'main',
                    docsPath: 'docs/06_SAP_Fiori_Elements',
                    category: 'fiori-elements-framework',
                    enabled: true
                },
                {
                    id: 'fiori-samples',
                    type: 'github',
                    owner: 'SAP-samples',
                    repo: 'fiori-tools-samples',
                    branch: 'main',
                    docsPath: '',
                    category: 'fiori-samples',
                    enabled: false
                },
                {
                    id: 'fiori-showcase',
                    type: 'github',
                    owner: 'SAP-samples',
                    repo: 'fiori-elements-feature-showcase',
                    branch: 'main',
                    docsPath: '',
                    category: 'fiori-features',
                    enabled: false
                },
                {
                    id: 'ui5-api',
                    type: 'json-api',
                    url: 'https://ui5.sap.com/test-resources/sap/fe/macros/designtime/apiref/api.json',
                    category: 'api-reference',
                    enabled: false
                }
            ]
        };
        this.requestCount = 0;
        this.documents = new Map();
        this.categories = new Map();
        this.sourceResults = new Map();
        this.gitReposPath = path.resolve(this.config.gitReposPath!);
        this.logger = new ToolsLogger();
        this.llm = new LLM();
        this.sourceMarkdown = new Map();
    }

    /**
     * Gets the system message for LLM processing.
     *
     * @returns The system message object with role and content
     */
    private getSystemMessage(): { role: string; content: string } {
        return {
            role: 'system',
            content: `You are a documentation optimizer for RAG-based code generation.
You are given a documentation snippet and you need to optimize it for AI agents to use when writing code.
The output will be used by AI code generation tools, so focus on making the content clear, concise, and code-focused.

Your task:
1. Extract and enhance code examples with proper context
2. Improve descriptions to be action-oriented for code generation
3. Combine related information that belongs together
4. Preserve all technical details, file paths, and code snippets
5. Format the output as markdown following this structure:

**TITLE**: [Clear, descriptive title]

**INTRODUCTION**: [Brief introduction explaining the purpose and use case]

**TAGS**: [Comma-separated relevant tags for searching]

**STEP**: [Step title/number]

**DESCRIPTION**: [Clear description of what needs to be done]

**LANGUAGE**: [Programming language name like TypeScript, JavaScript, XML, JSON, CDS, etc.]

**CODE**:
\`\`\`[language]
[code block]
\`\`\`

Repeat STEP/DESCRIPTION/LANGUAGE/CODE blocks as needed for multiple steps.

Return ONLY the formatted markdown. Do not add any explanations or meta-commentary outside the markdown format.`
        };
    }

    /**
     * Processes document content with LLM to optimize for RAG code generation.
     *
     * @param doc - The parsed document to process
     * @returns The optimized document content
     */
    private async processDocumentWithLLM(doc: ParsedDocument): Promise<string> {
        const maxRetries = 4;
        let retryCount = 0;

        while (retryCount < maxRetries) {
            try {
                const messages = [
                    this.getSystemMessage(),
                    {
                        role: 'user',
                        content: `Document Title: ${doc.title}\n\nCategory: ${doc.category}\n\nContent:\n${doc.content}`
                    }
                ];

                const response = await this.llm.send({
                    deployment_id: 'gpt-5-mini',
                    messages
                });

                return response.choices[0].message.content;
            } catch (error) {
                retryCount++;
                const errorMessage = error instanceof Error ? error.message : String(error);
                this.logger.warn(`LLM processing failed (attempt ${retryCount}/${maxRetries}): ${errorMessage}`);

                if (retryCount < maxRetries) {
                    await setTimeout(5000);
                } else {
                    this.logger.error(
                        `Failed to process document ${doc.id} after ${maxRetries} attempts, using original content`
                    );
                    // Fallback to original content in markdown format
                    return `# ${doc.title}\n\n${doc.content}`;
                }
            }
        }

        return `# ${doc.title}\n\n${doc.content}`;
    }

    /**
     * Clone or update a Git repository.
     *
     * @param source - Source configuration containing repository details
     * @returns Promise that resolves to the local repository path
     */
    async cloneOrUpdateRepository(source: SourceConfig): Promise<string> {
        const repoName = `${source.owner}-${source.repo}`;
        const repoPath = path.join(this.gitReposPath, repoName);
        const repoUrl = `https://github.com/${source.owner}/${source.repo}.git`;

        // Ensure git repos directory exists
        await fs.mkdir(this.gitReposPath, { recursive: true });

        try {
            // Check if repository already exists
            const repoExists = await this.directoryExists(repoPath);

            if (repoExists) {
                this.logger.info(`📂 Repository ${repoName} already exists, updating...`);
                try {
                    // Pull latest changes
                    await execCommand('git', ['pull', 'origin', source.branch ?? 'main'], { cwd: repoPath });
                    this.logger.info(`✓ Updated repository: ${repoName}`);
                } catch (pullError) {
                    const errorMessage = pullError instanceof Error ? pullError.message : String(pullError);
                    this.logger.warn(`Failed to pull updates for ${repoName}, using existing version: ${errorMessage}`);
                }
            } else {
                this.logger.info(`🔄 Cloning repository: ${repoUrl}`);
                await execCommand(
                    'git',
                    ['clone', '--depth', '1', '--branch', source.branch ?? 'main', repoUrl, repoName],
                    { cwd: this.gitReposPath }
                );
                this.logger.info(`✓ Cloned repository: ${repoName}`);
            }

            return repoPath;
        } catch (error) {
            throw new Error(`Failed to clone/update repository ${repoName}: ${error.message}`);
        }
    }

    /**
     * Check if a directory exists.
     *
     * @param dirPath - Directory path to check
     * @returns Promise that resolves to true if directory exists
     */
    private async directoryExists(dirPath: string): Promise<boolean> {
        try {
            const stat = await fs.stat(dirPath);
            return stat.isDirectory();
        } catch {
            return false;
        }
    }

    /**
     * Check if a directory should be skipped during traversal.
     *
     * @param dirName - Directory name to check
     * @returns True if directory should be skipped
     */
    private shouldSkipDirectory(dirName: string): boolean {
        return ['node_modules', '.git', 'dist', 'build', 'target'].includes(dirName);
    }

    /**
     * Check if a file has a supported extension.
     *
     * @param fileName - File name to check
     * @returns True if file has a supported extension
     */
    private hasSupportedExtension(fileName: string): boolean {
        const supportedExtensions = ['.md'];
        return supportedExtensions.some((ext) => fileName.endsWith(ext));
    }

    /**
     * Read a single file and create a GitHubFile object.
     *
     * @param fullEntryPath - Full path to the file
     * @param entryPath - Relative path to the file
     * @param entryName - Name of the file
     * @returns GitHubFile object or null if read fails
     */
    private async readSingleFile(
        fullEntryPath: string,
        entryPath: string,
        entryName: string
    ): Promise<GitHubFile | null> {
        try {
            const content = await fs.readFile(fullEntryPath, 'utf-8');
            return {
                name: entryName,
                path: entryPath,
                type: 'file',
                content
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.warn(`Failed to read file ${fullEntryPath}: ${errorMessage}`);
            return null;
        }
    }

    /**
     * Read files recursively from a local directory.
     *
     * @param basePath - Base directory path to search
     * @param relativePath - Relative path within the base directory
     * @returns Promise resolving to array of file contents
     */
    async readFilesFromDirectory(basePath: string, relativePath: string = ''): Promise<GitHubFile[]> {
        const files: GitHubFile[] = [];
        const fullPath = path.join(basePath, relativePath);

        try {
            const entries = await fs.readdir(fullPath, { withFileTypes: true });

            for (const entry of entries) {
                const entryPath = path.join(relativePath, entry.name);
                const fullEntryPath = path.join(fullPath, entry.name);

                if (entry.isDirectory() && !this.shouldSkipDirectory(entry.name)) {
                    const subFiles = await this.readFilesFromDirectory(basePath, entryPath);
                    files.push(...subFiles);
                } else if (entry.isFile() && this.hasSupportedExtension(entry.name)) {
                    const file = await this.readSingleFile(fullEntryPath, entryPath, entry.name);
                    if (file) {
                        files.push(file);
                    }
                }
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.warn(`Failed to read directory ${fullPath}: ${errorMessage}`);
        }

        return files;
    }

    /**
     * Parse document file into structured format.
     *
     * @param file - GitHub file object to parse
     * @param source - Source configuration or null
     * @returns Parsed document object
     */
    parseDocument(file: GitHubFile, source: SourceConfig | null = null): ParsedDocument {
        if (!file.content) {
            throw new Error(`No content found for file: ${file.path}`);
        }

        const fileExtension = path.extname(file.path).toLowerCase();
        const parseResult = this.parseFileByType(file, fileExtension);
        const category = this.extractCategory(file, source);
        const tags = this.generateTags(parseResult.parsed, category, fileExtension, file.name);
        const excerpt = this.generateExcerpt(parseResult.content, parseResult.parsed, fileExtension);

        return {
            id: file.path.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase(),
            title: parseResult.title,
            category: this.normalizeCategory(category),
            path: file.path,
            lastModified: new Date().toISOString(),
            tags,
            headers: parseResult.headers,
            content: parseResult.content,
            excerpt,
            wordCount: parseResult.content.split(/\s+/).length,
            version: '1.0.0'
        };
    }

    /**
     * Parse file content based on file type.
     *
     * @param file - GitHub file object
     * @param fileExtension - File extension
     * @returns Parse result with content, title, headers, and parsed data
     */
    private parseFileByType(
        file: GitHubFile,
        fileExtension: string
    ): {
        content: string;
        title: string;
        headers: string[];
        parsed: MatterResult;
    } {
        if (fileExtension === '.md') {
            return this.parseMarkdownFile(file);
        } else if (fileExtension === '.json') {
            return this.parseJsonFile(file);
        } else if (['.ts', '.js', '.xml', '.cds', '.html', '.properties', '.yaml', '.yml'].includes(fileExtension)) {
            return this.parseCodeFile(file, fileExtension);
        } else {
            return this.parsePlainTextFile(file);
        }
    }

    /**
     * Parse markdown file.
     *
     * @param file - GitHub file object
     * @returns Parse result for markdown file
     */
    private parseMarkdownFile(file: GitHubFile): {
        content: string;
        title: string;
        headers: string[];
        parsed: MatterResult;
    } {
        const parsed = matter(file.content!);
        const tokens = marked.lexer(parsed.content) as Token[];
        const headers = tokens.filter((token) => token.type === 'heading').map((token) => token.text);
        const title = parsed.data.title || headers[0] || file.name.replace(/\.md$/, '').replace(/[-_]/g, ' ');

        return {
            content: file.content!,
            title,
            headers,
            parsed
        };
    }

    /**
     * Parse JSON file.
     *
     * @param file - GitHub file object
     * @returns Parse result for JSON file
     */
    private parseJsonFile(file: GitHubFile): {
        content: string;
        title: string;
        headers: string[];
        parsed: MatterResult;
    } {
        try {
            const jsonContent = JSON.parse(file.content!);
            const content = `# ${file.name}\n\n\`\`\`json\n${JSON.stringify(jsonContent, null, 2)}\n\`\`\``;
            const title =
                jsonContent.name || jsonContent.title || file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
            const headers = Object.keys(jsonContent).slice(0, 10);

            return {
                content,
                title,
                headers,
                parsed: { data: {}, content }
            };
        } catch (error) {
            this.logger.debug(`Failed to parse JSON for file ${file.path}, treating as plain text. ${error.message}`);
            return this.parsePlainTextFile(file);
        }
    }

    /**
     * Parse code file (TS, JS, XML, etc.).
     *
     * @param file - GitHub file object
     * @param fileExtension - File extension
     * @returns Parse result for code file
     */
    private parseCodeFile(
        file: GitHubFile,
        fileExtension: string
    ): {
        content: string;
        title: string;
        headers: string[];
        parsed: MatterResult;
    } {
        const languageMap: Record<string, string> = {
            '.ts': 'typescript',
            '.js': 'javascript',
            '.xml': 'xml',
            '.cds': 'cds',
            '.html': 'html',
            '.properties': 'properties',
            '.yaml': 'yaml',
            '.yml': 'yaml'
        };

        const content = `# ${file.name}\n\n\`\`\`${languageMap[fileExtension] || 'text'}\n${file.content}\n\`\`\``;
        const title = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');

        let headers: string[] = [];
        if (['.ts', '.js'].includes(fileExtension)) {
            const functionMatches = file.content!.match(/(?:function\s+|class\s+|interface\s+|type\s+)(\w+)/g) || [];
            headers = functionMatches.map((match) => match.split(/\s+/).pop()!).slice(0, 10);
        }

        return {
            content,
            title,
            headers,
            parsed: { data: {}, content }
        };
    }

    /**
     * Parse plain text file.
     *
     * @param file - GitHub file object
     * @returns Parse result for plain text file
     */
    private parsePlainTextFile(file: GitHubFile): {
        content: string;
        title: string;
        headers: string[];
        parsed: MatterResult;
    } {
        const content = file.content!;
        const title = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');

        return {
            content,
            title,
            headers: [],
            parsed: { data: {}, content }
        };
    }

    /**
     * Extract category from file path or source.
     *
     * @param file - GitHub file object
     * @param source - Source configuration
     * @returns Category string
     */
    private extractCategory(file: GitHubFile, source: SourceConfig | null): string {
        if (source?.category) {
            return source.category;
        }

        const pathParts = file.path.split('/');
        return pathParts.length > 1 ? pathParts[pathParts.length - 2] : 'docs';
    }

    /**
     * Generate tags for document.
     *
     * @param parsed - Parsed matter result
     * @param category - Document category
     * @param fileExtension - File extension
     * @param fileName - File name
     * @returns Array of unique tags
     */
    private generateTags(parsed: MatterResult, category: string, fileExtension: string, fileName: string): string[] {
        const parsedTags = Array.isArray(parsed.data.tags) ? parsed.data.tags : [];
        const tags = [
            ...parsedTags.map(String),
            category,
            fileExtension.replace('.', ''),
            ...fileName.split(/[\s\-_\.\[\](){}!@#$%^&*+=|\\:";'<>?,/]+/).filter((word) => word.length > 2)
        ];

        return tags.filter((tag, index, arr) => arr.indexOf(tag) === index);
    }

    /**
     * Generate excerpt from content.
     *
     * @param content - Document content
     * @param parsed - Parsed matter result
     * @param fileExtension - File extension
     * @returns Excerpt string
     */
    private generateExcerpt(content: string, parsed: MatterResult, fileExtension: string): string {
        let plainText: string;

        if (fileExtension === '.md') {
            plainText = parsed.content
                .replace(/#{1,6}\s+/g, '')
                .replace(/\*\*(.*?)\*\*/g, '$1')
                .replace(/\*(.*?)\*/g, '$1')
                .replace(/`(.*?)`/g, '$1')
                .replace(/\[([^\[\]]*)\]\([^()]*\)/g, '$1')
                .replace(/\n+/g, ' ')
                .trim();
        } else {
            plainText = content
                .replace(/```[\s\S]*?```/g, '')
                .replace(/#{1,6}\s+/g, '')
                .replace(/\n+/g, ' ')
                .trim();
        }

        return plainText.length > 200 ? plainText.substring(0, 200) + '...' : plainText;
    }

    /**
     * Normalize category name to be URL-safe.
     *
     * @param category - Category name to normalize
     * @returns Normalized category string
     */
    normalizeCategory(category: string): string {
        return category
            .toLowerCase()
            .replace(/[^a-zA-Z0-9]/g, '-')
            .replace(/-{2,}/g, '-') // First collapse multiple dashes
            .replace(/^-/, '') // Then remove leading dash
            .replace(/-$/, ''); // Then remove trailing dash
    }

    async buildFilestore(): Promise<void> {
        this.logger.info('🚀 Starting multi-source documentation build...');

        try {
            // Ensure output directory exists
            await fs.mkdir(this.config.outputPath, { recursive: true });

            // Process sources in parallel (but limit concurrency to avoid rate limits)
            const enabledSources = this.config.sources.filter((source) => source.enabled);
            this.logger.info(`📚 Processing ${enabledSources.length} enabled sources in parallel...`);

            const concurrentSources = 2; // Process 2 sources at once to balance speed vs rate limits
            for (let i = 0; i < enabledSources.length; i += concurrentSources) {
                const batch = enabledSources.slice(i, i + concurrentSources);

                await Promise.all(
                    batch.map(async (source) => {
                        this.logger.info(`🔄 Starting source: ${source.id}`);
                        await this.processSource(source);
                    })
                );

                this.logger.info(
                    `✅ Completed batch ${Math.floor(i / concurrentSources) + 1}/${Math.ceil(
                        enabledSources.length / concurrentSources
                    )}`
                );
            }

            this.logger.info(`\n📊 Multi-source build summary:`);
            for (const [sourceId, result] of this.sourceResults.entries()) {
                const status = result.success ? '✅' : '❌';
                this.logger.info(`${status} ${sourceId}: ${result.documentsAdded} docs (${result.message})`);
            }

            // Save individual document files
            await this.saveDocuments();

            // Create master index
            await this.createMasterIndex();

            this.logger.info(`\n🎉 Multi-source documentation build completed!`);
            this.logger.info(`📊 Total documents: ${this.documents.size}`);
            this.logger.info(`📁 Categories: ${this.categories.size}`);
            this.logger.info(`🌐 GitHub API requests: ${this.requestCount}`);
            this.logger.info(`🔗 Sources processed: ${this.sourceResults.size}`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`❌ Build failed: ${errorMessage}`);
            process.exit(1);
        }
    }

    /**
     *
     * @param source
     */
    async processSource(source: SourceConfig): Promise<void> {
        this.logger.info(`\n📚 Processing source: ${source.id} (${source.type})`);

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

            this.logger.info(`📄 Found ${files.length} files from ${source.id}`);

            let successCount = 0;
            let failureCount = 0;

            // Process files in parallel batches for parsing and LLM optimization
            const parseBatchSize = 5; // Reduced batch size for LLM processing
            const startTime = Date.now();

            for (let i = 0; i < files.length; i += parseBatchSize) {
                const batch = files.slice(i, i + parseBatchSize);
                const batchStartTime = Date.now();

                this.logger.info(
                    `  🤖 Processing batch with LLM: ${i + 1}-${Math.min(i + parseBatchSize, files.length)}/${
                        files.length
                    }`
                );

                const parseResults = await Promise.allSettled(
                    batch.map(async (file) => {
                        const doc = this.parseDocument(file as GitHubFile, source);

                        // Ensure unique document IDs across sources
                        const docId = `${source.id}-${doc.id}`;
                        doc.id = docId;
                        doc.source = source.id;
                        doc.sourceType = source.type;

                        // Process with LLM to optimize for RAG
                        const optimizedMarkdown = await this.processDocumentWithLLM(doc);

                        return { docId, doc, optimizedMarkdown };
                    })
                );

                const batchTime = Date.now() - batchStartTime;
                const avgTimePerBatch = (Date.now() - startTime) / (i / parseBatchSize + 1);
                const remainingBatches = Math.ceil((files.length - (i + parseBatchSize)) / parseBatchSize);
                const estimatedRemainingTime = (avgTimePerBatch * remainingBatches) / 1000 / 60;

                this.logger.info(
                    `  ⏱️  Batch processed in ${(batchTime / 1000).toFixed(
                        1
                    )}s. Estimated remaining: ${estimatedRemainingTime.toFixed(1)} minutes`
                );

                // Process results and count successes/failures
                const batchResults = parseResults.reduce(
                    (counts, result, index) => {
                        if (result.status === 'fulfilled') {
                            const { docId, doc, optimizedMarkdown } = result.value;
                            this.documents.set(docId, doc);

                            // Store markdown for this source
                            if (!this.sourceMarkdown.has(source.id)) {
                                this.sourceMarkdown.set(source.id, []);
                            }
                            this.sourceMarkdown.get(source.id)!.push(optimizedMarkdown);

                            // Add to category mapping
                            if (!this.categories.has(doc.category)) {
                                this.categories.set(doc.category, []);
                            }
                            this.categories.get(doc.category)!.push(docId);

                            counts.success++;
                        } else {
                            const file = batch[index];
                            const errorMessage =
                                result.reason instanceof Error ? result.reason.message : String(result.reason);
                            this.logger.warn(`Failed to parse document ${file.path || file.name}: ${errorMessage}`);
                            counts.failure++;
                        }
                        return counts;
                    },
                    { success: 0, failure: 0 }
                );

                successCount += batchResults.success;
                failureCount += batchResults.failure;

                // Progress update
                const processed = Math.min(i + parseBatchSize, files.length);
                this.logger.info(`  📝 Parsed ${processed}/${files.length} files from ${source.id}`);
            }

            result.success = true;
            result.documentsAdded = successCount;
            result.message = `${successCount} docs added, ${failureCount} failed`;

            const duration = Date.now() - result.startTime;
            this.logger.info(`✅ ${source.id} completed in ${duration}ms: ${result.message}`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            result.success = false;
            result.message = errorMessage;
            this.logger.error(`❌ Failed to process source ${source.id}: ${errorMessage}`);

            // Continue with other sources instead of failing completely
        }

        this.sourceResults.set(source.id, result);
    }

    /**
     * Process GitHub source repository by cloning locally.
     *
     * @param source - Source configuration
     * @returns Promise resolving to array of file contents
     */
    async processGitHubSource(source: SourceConfig): Promise<FileContent[]> {
        try {
            // Clone or update the repository
            const repoPath = await this.cloneOrUpdateRepository(source);

            // Determine the path to read from within the repository
            const docsPath = source.docsPath ? path.join(repoPath, source.docsPath) : repoPath;

            this.logger.info(`📖 Reading files from: ${docsPath}`);

            // Read files from the local repository
            const files = await this.readFilesFromDirectory(docsPath);

            this.logger.info(`✓ Found ${files.length} files in ${source.id}`);

            return files as FileContent[];
        } catch (error) {
            throw new Error(`Failed to process GitHub source ${source.id}: ${error.message}`);
        }
    }

    /**
     * Load cached documents from disk.
     *
     * @param source - Source configuration
     * @returns Promise resolving to array of cached file contents
     */
    async loadCachedDocuments(source: SourceConfig): Promise<FileContent[]> {
        // Try new source-based structure first
        const sourceBasedFiles = await this.loadFromSourceBasedStructure(source);
        return sourceBasedFiles ?? [];
    }

    /**
     * Load cached documents from source-based directory structure.
     *
     * @param source - Source configuration
     * @returns Promise resolving to array of cached file contents
     */
    private async loadFromSourceBasedStructure(source: SourceConfig): Promise<FileContent[]> {
        try {
            const sourceDir = path.join(this.config.outputPath, source.id);
            const sourceStat = await fs.stat(sourceDir);

            if (!sourceStat.isDirectory()) {
                return [];
            }

            const categories = await fs.readdir(sourceDir);
            const files: FileContent[] = [];

            for (const category of categories) {
                const categoryFiles = await this.loadFromCategory(sourceDir, category);
                files.push(...categoryFiles);
            }

            return files;
        } catch (error) {
            this.logger.warn(`Source directory not found, trying fallback structure: ${error.message}`);
            return [];
        }
    }

    /**
     * Load files from a specific category directory.
     *
     * @param sourceDir - Source directory path
     * @param category - Category name
     * @returns Promise resolving to array of file contents from the category
     */
    private async loadFromCategory(sourceDir: string, category: string): Promise<FileContent[]> {
        try {
            const categoryPath = path.join(sourceDir, category);
            const categoryStat = await fs.stat(categoryPath);

            if (!categoryStat.isDirectory()) {
                return [];
            }

            const categoryFiles = await fs.readdir(categoryPath);
            const files: FileContent[] = [];

            for (const file of categoryFiles) {
                if (file.endsWith('.json')) {
                    const fileContent = await this.loadDocumentFile(categoryPath, file);
                    if (fileContent) {
                        files.push(fileContent);
                    }
                }
            }

            return files;
        } catch (error) {
            this.logger.warn(`Skipping category directory due to error: ${error.message}`);
            return [];
        }
    }

    /**
     * Load a single document file and convert to FileContent.
     *
     * @param categoryPath - Category directory path
     * @param fileName - File name
     * @returns Promise resolving to FileContent or null if failed
     */
    private async loadDocumentFile(categoryPath: string, fileName: string): Promise<FileContent | null> {
        try {
            const filePath = path.join(categoryPath, fileName);
            const docData = JSON.parse(await fs.readFile(filePath, 'utf-8'));

            return {
                name: `${docData.title}.md`,
                path: docData.path,
                content: docData.content,
                download_url: 'cached'
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.warn(`Failed to load document file ${fileName}: ${errorMessage}`);
            return null;
        }
    }

    /**
     * Process JSON API source.
     *
     * @param source - Source configuration
     * @returns Promise resolving to array of file contents
     */
    async processJsonApiSource(source: SourceConfig): Promise<FileContent[]> {
        this.logger.info(`Fetching API documentation from: ${source.url}`);

        try {
            const response = await fetch(source.url!);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const apiData = (await response.json()) as ApiData | ApiSymbol[];
            return this.convertApiToDocuments(apiData, source);
        } catch (error) {
            throw new Error(`Failed to fetch API documentation: ${error.message}`);
        }
    }

    /**
     * Convert API data to document format.
     *
     * @param apiData - API data to convert
     * @param source - Source configuration
     * @returns Array of file contents
     */
    convertApiToDocuments(apiData: ApiData | ApiSymbol[], source: SourceConfig): FileContent[] {
        const documents: FileContent[] = [];

        // Handle different API structures
        if (!Array.isArray(apiData) && apiData.symbols) {
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
            for (let index = 0; index < apiData.length; index++) {
                const item: ApiSymbol = apiData[index];
                documents.push({
                    name: `api-item-${index}.md`,
                    path: `api/item-${index}.md`,
                    content: this.generateApiDocContent(item),
                    download_url: source.url
                });
            }
        } else {
            // Single API object
            documents.push({
                name: 'api-reference.md',
                path: 'api/reference.md',
                content: this.generateApiDocContent(apiData),
                download_url: source.url
            });
        }

        this.logger.info(`Generated ${documents.length} API documents`);
        return documents;
    }

    /**
     * Generate API documentation content from API item.
     *
     * @param apiItem - API item to generate content for
     * @returns Generated documentation content as string
     */
    generateApiDocContent(apiItem: ApiSymbol | Record<string, unknown>): string {
        if (!apiItem) {
            return this.getDefaultApiDocContent();
        }

        const headerContent = this.generateApiHeader(apiItem);
        const metadataContent = this.generateApiMetadata(apiItem);
        const methodsContent = this.generateApiMethods(apiItem);
        const propertiesContent = this.generateApiProperties(apiItem);

        const content = headerContent + metadataContent + methodsContent + propertiesContent;

        return content || this.generateFallbackApiContent(apiItem);
    }

    /**
     * Get default API documentation content for empty items.
     *
     * @returns Default API documentation string
     */
    private getDefaultApiDocContent(): string {
        return '# API Documentation\n\nNo content available.';
    }

    /**
     * Generate API header content (name and description).
     *
     * @param apiItem - API item
     * @returns Header content string
     */
    private generateApiHeader(apiItem: ApiSymbol | Record<string, unknown>): string {
        let content = '';

        if (apiItem.name) {
            content += `# ${String(apiItem.name)}\n\n`;
        }

        if (apiItem.description) {
            content += `${String(apiItem.description)}\n\n`;
        }

        return content;
    }

    /**
     * Generate API metadata content (type and module).
     *
     * @param apiItem - API item
     * @returns Metadata content string
     */
    private generateApiMetadata(apiItem: ApiSymbol | Record<string, unknown>): string {
        let content = '';

        if (apiItem.kind) {
            content += `**Type:** ${String(apiItem.kind)}\n\n`;
        }

        if (apiItem.module) {
            content += `**Module:** ${String(apiItem.module)}\n\n`;
        }

        return content;
    }

    /**
     * Generate API methods section.
     *
     * @param apiItem - API item
     * @returns Methods content string
     */
    private generateApiMethods(apiItem: ApiSymbol | Record<string, unknown>): string {
        if (!('methods' in apiItem) || !Array.isArray(apiItem.methods)) {
            return '';
        }

        let content = '## Methods\n\n';

        for (const method of apiItem.methods) {
            content += `### ${String(method.name)}\n`;
            if (method.description) {
                content += `${String(method.description)}\n\n`;
            }
        }

        return content;
    }

    /**
     * Generate API properties section.
     *
     * @param apiItem - API item
     * @returns Properties content string
     */
    private generateApiProperties(apiItem: ApiSymbol | Record<string, unknown>): string {
        if (!('properties' in apiItem) || !Array.isArray(apiItem.properties)) {
            return '';
        }

        let content = '## Properties\n\n';

        for (const prop of apiItem.properties) {
            content += `### ${String(prop.name)}\n`;
            if (prop.description) {
                content += `${String(prop.description)}\n\n`;
            }
        }

        return content;
    }

    /**
     * Generate fallback API content for objects without specific structure.
     *
     * @param apiItem - API item
     * @returns Fallback content string
     */
    private generateFallbackApiContent(apiItem: ApiSymbol | Record<string, unknown>): string {
        if (typeof apiItem === 'object') {
            return `# API Reference\n\n\`\`\`json\n${JSON.stringify(apiItem, null, 2)}\n\`\`\`\n`;
        }

        return this.getDefaultApiDocContent();
    }

    async saveDocuments(): Promise<void> {
        this.logger.info('\n💾 Saving aggregated markdown files by source...');

        await fs.mkdir(this.config.outputPath, { recursive: true });

        for (const [sourceId, markdownChunks] of this.sourceMarkdown) {
            const outputFilePath = path.join(this.config.outputPath, `${sourceId}.md`);

            // Combine all markdown chunks with separators
            let aggregatedMarkdown = '\n';
            for (const chunk of markdownChunks) {
                aggregatedMarkdown += '--------------------------------\n\n';
                aggregatedMarkdown += chunk;
                aggregatedMarkdown += '\n';
            }
            aggregatedMarkdown += '--------------------------------\n';

            await fs.writeFile(outputFilePath, aggregatedMarkdown, 'utf-8');
            this.logger.info(`✓ Saved ${markdownChunks.length} documents to ${outputFilePath}`);
        }

        this.logger.info(`✓ Saved ${this.sourceMarkdown.size} markdown files (one per source)`);
    }

    async createMasterIndex(): Promise<void> {
        this.logger.info('\n📋 Creating master index...');

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

        const sourceFiles: Record<string, { path: string; documentCount: number }> = {};
        for (const [sourceId, markdownChunks] of this.sourceMarkdown) {
            sourceFiles[sourceId] = {
                path: `${sourceId}.md`,
                documentCount: markdownChunks.length
            };
        }

        const index = {
            version: '1.0.0',
            generatedAt: new Date().toISOString(),
            totalDocuments: this.documents.size,
            categories,
            sources: sourceFiles
        };

        const indexPath = path.join(this.config.outputPath, 'index.json');
        await fs.writeFile(indexPath, JSON.stringify(index, null, 2));

        this.logger.info(`✓ Created master index: ${indexPath}`);
    }
}

// Export the class
export { MultiSourceDocumentationBuilder };

// Run the builder
/* istanbul ignore if */
if (require.main === module) {
    const logger = new ToolsLogger();
    const builder = new MultiSourceDocumentationBuilder();
    builder.buildFilestore().catch((error) => {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Build failed: ${errorMessage}`);
        process.exit(1);
    });
}
