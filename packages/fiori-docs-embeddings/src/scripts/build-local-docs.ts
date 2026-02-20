#!/usr/bin/env node

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { spawn } from 'node:child_process';
import { XMLParser } from 'fast-xml-parser';
import * as readline from 'node:readline';
import { ToolsLogger, type Logger } from '@sap-ux/logger';

const fpmExplorerFolder = 'packages/sap.fe.core/test/sap/fe/core/fpmExplorer';

// Create promisified version of spawn for async/await
const execCommand = (
    command: string,
    args: string[],
    options: SpawnOptions
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

interface FpmPage {
    title: string;
    introduction: string;
}

interface ImplementationStep {
    title: string;
    text: string;
    codeBlocks: CodeBlock[];
}

interface CodeBlock {
    codeType: string;
    content: string;
    file?: string;
    filePath?: string;
}

interface FpmDocument {
    title: string;
    introduction: string;
    implementationSteps: ImplementationStep[];
    tags?: string;
    files?: FileReference[];
}

interface FileReference {
    url: string;
    name: string;
    key: string;
}

interface NavigationItem {
    key: string;
    title?: string;
    chapter?: string;
    tags?: string;
    icon?: string;
    editable?: boolean;
    files?: FileReference[];
    items?: NavigationItem[];
    nextGen?: boolean;
    downloadProject?: boolean;
    hash?: string;
    topic?: string;
    experimental?: boolean;
    skipHeader?: boolean;
}

interface ParsedXmlNode {
    '@_title'?: string;
    '@_introduction'?: string;
    '@_text'?: string;
    '@_codeType'?: string;
    '@_file'?: string;
    '#text'?: string;
    'mvc:View'?: {
        'fpmExplorer:Page'?: ParsedXmlPageElement;
    };
    'fpmExplorer:Page'?: ParsedXmlPageElement;
    'fpmExplorer:implementation'?: {
        'fpmExplorer:ImplementationStep'?: ParsedXmlStepElement | ParsedXmlStepElement[];
    };
    'fpmExplorer:ImplementationStep'?: ParsedXmlStepElement | ParsedXmlStepElement[];
    'fpmExplorer:CodeBlock'?: ParsedXmlCodeBlock | ParsedXmlCodeBlock[];
    'fpmExplorer:CodeLink'?: ParsedXmlCodeLink | ParsedXmlCodeLink[];
}

interface ParsedXmlPageElement extends ParsedXmlNode {
    'fpmExplorer:implementation'?: {
        'fpmExplorer:ImplementationStep'?: ParsedXmlStepElement | ParsedXmlStepElement[];
    };
}

interface ParsedXmlStepElement extends ParsedXmlNode {
    'fpmExplorer:CodeBlock'?: ParsedXmlCodeBlock | ParsedXmlCodeBlock[];
}

interface ParsedXmlCodeBlock extends ParsedXmlNode {
    'fpmExplorer:CodeLink'?: ParsedXmlCodeLink | ParsedXmlCodeLink[];
}

interface ParsedXmlCodeLink extends ParsedXmlNode {}

interface SpawnOptions {
    cwd?: string;
    stdio?: string | [string, string, string];
}

/**
 * FPM Documentation Builder for extracting and parsing SAP FE documentation
 */
class FpmDocumentationBuilder {
    private readonly gitReposPath: string;
    private readonly outputPath: string;
    private githubHost: string;
    private githubToken: string;
    private readonly logger: Logger;

    constructor() {
        this.gitReposPath = path.resolve('./data/git_repos');
        this.outputPath = path.resolve('./data_local/fiori_development_portal.md');
        this.githubHost = '';
        this.githubToken = '';
        this.logger = new ToolsLogger();
    }

    /**
     * Prompt user for input if environment variable is not set.
     *
     * @param question - The question to ask the user
     * @returns The user's input
     */
    private async promptForInput(question: string): Promise<string> {
        const readlineInterface = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        return new Promise((resolve) => {
            readlineInterface.question(question, (answer) => {
                readlineInterface.close();
                resolve(answer.trim());
            });
        });
    }

    /**
     * Initialize GitHub configuration from environment or prompt user.
     */
    private async initializeGitHubConfig(): Promise<void> {
        // Get GitHub host
        this.githubHost = process.env.GITHUB_HOST || '';
        if (!this.githubHost) {
            this.githubHost = await this.promptForInput('Enter GitHub host (e.g., github.xxx.xxx): ');
        }

        // Get GitHub token
        this.githubToken = process.env.GITHUB_TOKEN || '';
        if (!this.githubToken) {
            this.githubToken = await this.promptForInput('Enter GitHub token: ');
        }

        if (!this.githubHost || !this.githubToken) {
            throw new Error('GitHub host and token are required');
        }
    }

    /**
     * Clone or update the sap.fe repository.
     *
     * @returns The path to the cloned repository
     */
    private async cloneOrUpdateRepository(): Promise<string> {
        const repoName = 'sap.fe';
        const repoPath = path.join(this.gitReposPath, repoName);
        const repoUrl = `https://${this.githubToken}@${this.githubHost}/ux/sap.fe.git`;

        // Ensure git repos directory exists
        await fs.mkdir(this.gitReposPath, { recursive: true });

        try {
            // Check if repository already exists
            const repoExists = await this.directoryExists(repoPath);

            if (repoExists) {
                this.logger.info(`📂 Repository ${repoName} already exists, updating...`);
                try {
                    // Pull latest changes
                    await execCommand('git', ['pull', 'origin', 'main'], { cwd: repoPath });
                    this.logger.info(`✓ Updated repository: ${repoName}`);
                } catch (pullError) {
                    this.logger.warn(
                        `Failed to pull updates for ${repoName}, using existing version: ${pullError.message}`
                    );
                }
            } else {
                this.logger.info(`🔄 Cloning repository: ${repoUrl.replace(this.githubToken, '***')}`);
                await execCommand('git', ['clone', '--depth', '1', '--branch', 'main', repoUrl, repoName], {
                    cwd: this.gitReposPath
                });
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
     * @param dirPath - The path to the directory
     * @returns True if the directory exists, false otherwise
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
     * Locate .view.xml files that contain fpmExplorer elements.
     *
     * @param repoPath - The path to the repository
     * @returns A map of file names to file paths
     */
    private async locateFpmExplorerViewFiles(repoPath: string): Promise<Map<string, string>> {
        const viewFiles = new Map<string, string>();
        const searchPaths = [fpmExplorerFolder];

        for (const searchPath of searchPaths) {
            const fullSearchPath = path.join(repoPath, searchPath);

            try {
                const exists = await this.directoryExists(fullSearchPath);
                if (exists) {
                    await this.scanDirectoryForFpmExplorerFiles(fullSearchPath, viewFiles);
                }
            } catch (error) {
                this.logger.warn(`Failed to scan directory ${fullSearchPath}: ${error.message}`);
            }
        }

        this.logger.info(`📄 Found ${viewFiles.size} fpmExplorer view files`);
        return viewFiles;
    }

    /**
     * Recursively scan directory for XML files containing fpmExplorer elements.
     *
     * @param dirPath - The directory path to scan
     * @param viewFiles - Map to store found view files
     */
    private async scanDirectoryForFpmExplorerFiles(dirPath: string, viewFiles: Map<string, string>): Promise<void> {
        try {
            const entries = await fs.readdir(dirPath, { withFileTypes: true });

            for (const entry of entries) {
                const fullPath = path.join(dirPath, entry.name);
                if (entry.isDirectory()) {
                    // Recursively scan subdirectories
                    await this.scanDirectoryForFpmExplorerFiles(fullPath, viewFiles);
                } else if (entry.isFile() && entry.name.endsWith('.view.xml')) {
                    // Check if this XML file contains fpmExplorer elements
                    try {
                        const content = await fs.readFile(fullPath, 'utf-8');
                        if (content.includes('fpmExplorer:')) {
                            const relativePath = path.relative(path.join(dirPath, '../../../'), fullPath);
                            viewFiles.set(relativePath, fullPath);
                            this.logger.info(`✓ Found fpmExplorer file: ${relativePath}`);
                        }
                    } catch (error) {
                        this.logger.warn(`Failed to read file ${fullPath}: ${error.message}`);
                    }
                }
            }
        } catch (error) {
            this.logger.warn(`Failed to scan directory ${dirPath}: ${error.message}`);
        }
    }

    /**
     * Parse XML content and extract FPM elements.
     *
     * @param filePath - Path to the XML file
     * @returns Array of FPM documents
     */
    private async parseXmlFile(filePath: string): Promise<FpmDocument[]> {
        try {
            const xmlContent = await fs.readFile(filePath, 'utf-8');

            const parser = new XMLParser({
                ignoreAttributes: false,
                attributeNamePrefix: '@_',
                textNodeName: '#text',
                preserveOrder: false,
                parseAttributeValue: true
            });

            const parsedXml = parser.parse(xmlContent);
            const documents: FpmDocument[] = [];

            // Navigate through the parsed XML structure to find fpmExplorer:Page elements
            const basePath = path.dirname(filePath);
            await this.extractDocumentsFromParsedXml(parsedXml, documents, basePath);

            return documents;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to parse XML file ${filePath}: ${errorMessage}`);
        }
    }

    /**
     * Extract documents from parsed XML structure.
     *
     * @param obj - The parsed XML object
     * @param documents - Array to store extracted documents
     * @param basePath - Base path for resolving file references
     */
    private async extractDocumentsFromParsedXml(
        obj: ParsedXmlNode,
        documents: FpmDocument[],
        basePath: string
    ): Promise<void> {
        // Navigate to mvc:View -> fpmExplorer:Page
        if (obj['mvc:View']?.['fpmExplorer:Page']) {
            await this.processPageElement(obj['mvc:View']['fpmExplorer:Page'], documents, basePath);
        }
    }

    /**
     * Process an fpmExplorer:Page element.
     *
     * @param pageElement - The page element to process
     * @param documents - Array to store extracted documents
     * @param basePath - Base path for resolving file references
     */
    private async processPageElement(
        pageElement: ParsedXmlPageElement,
        documents: FpmDocument[],
        basePath: string
    ): Promise<void> {
        const pageInfo = this.extractPageInfo(pageElement);

        // Process implementation steps
        if (pageElement['fpmExplorer:implementation']?.['fpmExplorer:ImplementationStep']) {
            const implementationSteps = pageElement['fpmExplorer:implementation']['fpmExplorer:ImplementationStep'];
            await this.processImplementationSteps(implementationSteps, pageInfo, documents, basePath);
        }
    }

    /**
     * Process implementation steps.
     *
     * @param steps - The implementation steps to process
     * @param pageInfo - Information about the parent page
     * @param documents - Array to store extracted documents
     * @param basePath - Base path for resolving file references
     */
    private async processImplementationSteps(
        steps: ParsedXmlStepElement | ParsedXmlStepElement[],
        pageInfo: FpmPage,
        documents: FpmDocument[],
        basePath: string
    ): Promise<void> {
        const stepArray = Array.isArray(steps) ? steps : [steps];
        const implementationSteps: ImplementationStep[] = [];

        for (const step of stepArray) {
            const stepTitle = this.extractImplementationStepTitle(step);
            const stepText = this.extractImplementationStepText(step);

            // Process code blocks within this step
            let codeBlocks: CodeBlock[] = [];
            if (step['fpmExplorer:CodeBlock']) {
                codeBlocks = await this.processCodeBlocks(step['fpmExplorer:CodeBlock'], basePath);
            }

            // Add this implementation step
            implementationSteps.push({
                title: stepTitle,
                text: stepText,
                codeBlocks: codeBlocks
            });
        }

        // Add document with all implementation steps
        if (implementationSteps.length > 0) {
            documents.push({
                title: pageInfo.title || 'Untitled',
                introduction: pageInfo.introduction || 'No introduction',
                implementationSteps: implementationSteps
            });
        }
    }

    /**
     * Process code blocks.
     *
     * @param codeBlocks - The code blocks to process
     * @param basePath - Base path for resolving file references
     * @returns Array of processed code blocks
     */
    private async processCodeBlocks(
        codeBlocks: ParsedXmlCodeBlock | ParsedXmlCodeBlock[],
        basePath: string
    ): Promise<CodeBlock[]> {
        const blockArray = Array.isArray(codeBlocks) ? codeBlocks : [codeBlocks];
        const allCodeBlocks: CodeBlock[] = [];

        for (const codeBlock of blockArray) {
            const codeInfos = await this.extractCodeBlocks(codeBlock, basePath);

            for (const codeInfo of codeInfos) {
                if (codeInfo.content) {
                    allCodeBlocks.push(codeInfo);
                }
            }
        }

        return allCodeBlocks;
    }

    /**
     * Extract page information (title and introduction).
     *
     * @param pageElement - The page element to extract from
     * @returns The extracted page information
     */
    private extractPageInfo(pageElement: ParsedXmlNode): FpmPage {
        const title = pageElement['@_title'] || '';
        const introduction = pageElement['@_introduction'] || '';

        return { title, introduction };
    }

    /**
     * Extract implementation step text.
     *
     * @param stepElement - The step element to extract from
     * @returns The extracted step text
     */
    private extractImplementationStepText(stepElement: ParsedXmlNode): string {
        return stepElement['@_text'] || '';
    }

    /**
     * Extract implementation step title.
     *
     * @param stepElement - The step element to extract from
     * @returns The extracted step title
     */
    private extractImplementationStepTitle(stepElement: ParsedXmlNode): string {
        return stepElement['@_title'] || 'Implementation';
    }

    /**
     * Extract code block content.
     *
     * @param codeBlockElement - The code block element to extract from
     * @param basePath - Base path for resolving file references
     * @returns Array of extracted code blocks
     */
    private async extractCodeBlocks(codeBlockElement: ParsedXmlCodeBlock, basePath: string): Promise<CodeBlock[]> {
        const codeBlocks: CodeBlock[] = [];

        // Only process CodeLink elements, ignore inline text content
        if (codeBlockElement['fpmExplorer:CodeLink']) {
            // Process CodeLink elements
            const codeLink = codeBlockElement['fpmExplorer:CodeLink'];
            for (const codeLinkItem of Array.isArray(codeLink) ? codeLink : [codeLink]) {
                const file = codeLinkItem['@_file'];
                const codeType = codeLinkItem['@_codeType'] || file?.split('.').pop() || 'text';

                if (file) {
                    const { content, filePath } = await this.readCodeFile(basePath, file);
                    // Always push code block even if content is empty (when file read fails)
                    codeBlocks.push({ codeType, content: content.trim(), file, filePath });
                }
            }
        }

        return codeBlocks;
    }

    /**
     * Read code file from file system with fallback paths.
     *
     * @param basePath - Base path for resolving file
     * @param file - File name to read
     * @returns File content or empty string if failed
     */
    private async readCodeFile(basePath: string, file: string): Promise<{ content: string; filePath: string }> {
        try {
            const filePath = path.join(basePath, '..', file);
            const content = await fs.readFile(filePath, 'utf-8');
            return { content, filePath };
        } catch {
            try {
                const filePath = path.join(basePath, '../../', file);
                const content = await fs.readFile(filePath, 'utf-8');
                return { content, filePath };
            } catch (readError) {
                const errorMessage = readError instanceof Error ? readError.message : String(readError);
                this.logger.warn(`Failed to read code file ${file}: ${errorMessage}`);
                return { content: '', filePath: '' };
            }
        }
    }

    /**
     * Generate markdown output from FPM documents.
     *
     * @param documents - Array of FPM documents to convert to markdown
     * @returns Generated markdown string
     */
    private async generateMarkdown(documents: FpmDocument[]): Promise<string> {
        let markdown = '\n';

        for (const doc of documents) {
            markdown += await this.generateDocumentMarkdown(doc);
        }

        markdown += '--------------------------------\n';

        return markdown;
    }

    /**
     * Generate markdown for a single document.
     *
     * @param doc - FPM document to convert
     * @returns Markdown string for the document
     */
    private async generateDocumentMarkdown(doc: FpmDocument): Promise<string> {
        let markdown = '--------------------------------\n\n';
        markdown += `**TITLE**: ${doc.title}\n\n`;
        markdown += `**INTRODUCTION**: ${doc.introduction}\n\n`;

        // Add tags if available
        if (doc.tags) {
            markdown += `**TAGS**: ${doc.tags}\n\n`;
        }

        const codeBlockFiles = this.generateImplementationStepsMarkdown(doc.implementationSteps);
        markdown += codeBlockFiles.markdown;

        markdown += await this.generateAdditionalFilesMarkdown(doc.files, codeBlockFiles.filePaths);

        return markdown;
    }

    /**
     * Generate markdown for implementation steps and collect code block file paths.
     *
     * @param steps - Implementation steps to process
     * @returns Object with generated markdown and list of file paths
     */
    private generateImplementationStepsMarkdown(steps: ImplementationStep[]): {
        markdown: string;
        filePaths: string[];
    } {
        let markdown = '';
        const filePaths: string[] = [];

        for (const step of steps) {
            markdown += `**STEP**: ${step.title}\n\n`;
            markdown += `**DESCRIPTION**: ${step.text}\n\n`;

            for (const codeBlock of step.codeBlocks) {
                markdown += this.generateCodeBlockMarkdown(codeBlock);
                if (codeBlock.filePath) {
                    filePaths.push(path.resolve(codeBlock.filePath));
                }
            }
        }

        return { markdown, filePaths };
    }

    /**
     * Generate markdown for a single code block.
     *
     * @param codeBlock - Code block to convert
     * @returns Markdown string for the code block
     */
    private generateCodeBlockMarkdown(codeBlock: CodeBlock): string {
        const markdownLanguage = this.convertToMarkdownLanguage(codeBlock.codeType);
        let markdown = `**LANGUAGE**: ${this.convertToLanguage(codeBlock.codeType)}\n\n`;
        markdown += `**CODE**:\n`;
        markdown += '```' + (markdownLanguage || '') + '\n';
        markdown += codeBlock.content;
        markdown += '\n```\n\n';
        return markdown;
    }

    /**
     * Generate markdown for additional files not already in code blocks.
     *
     * @param files - File references to process
     * @param codeBlockFiles - List of file paths already included in code blocks
     * @returns Markdown string for additional files
     */
    private async generateAdditionalFilesMarkdown(
        files: FileReference[] | undefined,
        codeBlockFiles: string[]
    ): Promise<string> {
        if (!files) {
            return '';
        }

        // Check if there are any files not already included in codeBlocks
        const hasNewFiles = files.some((f) => {
            // Remove leading slash from file.url if present
            const cleanUrl = f.url.startsWith('/') ? f.url.slice(1) : f.url;
            const filePath = path.resolve(this.gitReposPath, 'sap.fe', fpmExplorerFolder, cleanUrl);
            return !codeBlockFiles.includes(filePath);
        });

        if (!hasNewFiles) {
            return '';
        }

        let markdown = `**ADDITIONAL RELATED CODE BLOCKS**:\n\n`;

        for (const file of files) {
            markdown += await this.generateFileMarkdown(file, codeBlockFiles);
        }

        return markdown;
    }

    /**
     * Generate markdown for a single additional file.
     *
     * @param file - File reference to process
     * @param codeBlockFiles - List of file paths already included in code blocks
     * @returns Markdown string for the file
     */
    private async generateFileMarkdown(file: FileReference, codeBlockFiles: string[]): Promise<string> {
        // Remove leading slash from file.url if present
        const cleanUrl = file.url.startsWith('/') ? file.url.slice(1) : file.url;
        const filePath = path.resolve(this.gitReposPath, 'sap.fe', fpmExplorerFolder, cleanUrl);

        // Skip if already included in codeBlocks
        if (codeBlockFiles.includes(filePath)) {
            return '';
        }

        // Determine language from file extension
        const extension = file.name.split('.').pop()?.toLowerCase() || '';
        const codeType = extension;
        const markdownLanguage = this.convertToMarkdownLanguage(codeType);
        const language = this.convertToLanguage(codeType);

        let markdown = `**FILE**: ${file.name}\n\n`;
        markdown += `**LANGUAGE**: ${language}\n\n`;
        markdown += `**CODE**:\n`;
        markdown += '```' + (markdownLanguage || '') + '\n';

        // Read file content
        try {
            const content = await fs.readFile(filePath, 'utf-8');
            markdown += content;
        } catch (error) {
            markdown += `// Error reading file: ${error.message}`;
        }

        markdown += '\n```\n\n';

        return markdown;
    }

    /**
     * Convert codeType to markdown-supported language.
     *
     * @param codeType - The code type to convert
     * @returns Markdown-supported language identifier or empty string
     */
    private convertToLanguage(codeType: string): string {
        const languageMap: Record<string, string> = {
            'view': 'XML',
            'ts': 'TypeScript',
            'js': 'JavaScript',
            'json': 'JSON',
            'xml': 'XML',
            'html': 'HTML',
            'css': 'CSS',
            'yaml': 'YAML',
            'yml': 'YAML',
            'cds': 'CDS',
            'manifest': 'JSON',
            'properties': 'PROPERTIES',
            'rap': 'ABAP'
        };

        return languageMap[codeType.toLowerCase()] || '';
    }

    /**
     * Convert codeType to markdown-supported language.
     *
     * @param codeType - The code type to convert
     * @returns Markdown-supported language identifier or empty string
     */
    private convertToMarkdownLanguage(codeType: string): string {
        const languageMap: Record<string, string> = {
            'view': 'xml',
            'ts': 'typescript',
            'js': 'javascript',
            'json': 'json',
            'xml': 'xml',
            'html': 'html',
            'css': 'css',
            'yaml': 'yaml',
            'yml': 'yaml',
            'cds': 'cds',
            'manifest': 'json',
            'properties': 'properties',
            'rap': 'abap'
        };

        return languageMap[codeType.toLowerCase()] || '';
    }

    /**
     * Merge navigation model and page configuration based on key.
     *
     * @param navigationModelPath - Path to navigationModel.json
     * @param pageConfigurationPath - Path to pageConfiguration.json
     * @returns Merged navigation structure
     */
    async mergeNavigationFiles(
        navigationModelPath: string,
        pageConfigurationPath: string
    ): Promise<{ navigation: NavigationItem[] }> {
        // Read both JSON files
        const navigationModelContent = await fs.readFile(navigationModelPath, 'utf-8');
        const pageConfigurationContent = await fs.readFile(pageConfigurationPath, 'utf-8');

        const navigationModel = JSON.parse(navigationModelContent) as { navigation: NavigationItem[] };
        const pageConfiguration = JSON.parse(pageConfigurationContent) as { navigation: NavigationItem[] };

        // Create a map from pageConfiguration for quick lookup by key
        const configMap = new Map<string, NavigationItem>();

        const addToMap = (items: NavigationItem[]): void => {
            for (const item of items) {
                configMap.set(item.key, item);
                if (item.items) {
                    addToMap(item.items);
                }
            }
        };

        addToMap(pageConfiguration.navigation);

        // Merge function to recursively merge navigation items with page configuration
        const mergeItems = (navItems: NavigationItem[]): NavigationItem[] => {
            return navItems.map((navItem) => {
                const merged = { ...navItem };
                const config = configMap.get(navItem.key);

                if (config) {
                    // Merge config properties into navItem (config properties take precedence for duplicates)
                    Object.assign(merged, config, navItem);
                    // Keep original navigation properties like title, chapter, tags, icon from navItem
                    if (navItem.title) {
                        merged.title = navItem.title;
                    }
                    if (navItem.chapter) {
                        merged.chapter = navItem.chapter;
                    }
                    if (navItem.tags) {
                        merged.tags = navItem.tags;
                    }
                    if (navItem.icon) {
                        merged.icon = navItem.icon;
                    }
                }

                if (navItem.items) {
                    merged.items = mergeItems(navItem.items);
                }

                return merged;
            });
        };

        // Merge the navigation arrays
        return {
            navigation: mergeItems(navigationModel.navigation)
        };
    }

    /**
     * Ensure output directory exists.
     */
    private async ensureOutputDirectory(): Promise<void> {
        const outputDir = path.dirname(this.outputPath);
        await fs.mkdir(outputDir, { recursive: true });
    }

    /**
     * Extract additional information from merged navigation JSON for a given file.
     *
     * @param fileName - The file name/path to extract info for
     * @param mergedNavigation - The merged navigation structure
     * @param mergedNavigation.navigation - Array of navigation items
     * @returns Object containing tags and files (if editable)
     */
    private async getAdditionalInfoFromJson(
        fileName: string,
        mergedNavigation: { navigation: NavigationItem[] }
    ): Promise<{ tags?: string; files?: FileReference[] } | undefined> {
        const key = path.dirname(fileName).split(path.sep).pop();
        if (!key) {
            return undefined;
        }

        // Recursively search for ALL items with the matching key
        const findAllItemsByKey = (items: NavigationItem[], searchKey: string): NavigationItem[] => {
            const matches: NavigationItem[] = [];
            for (const item of items) {
                if (item.key === searchKey) {
                    matches.push(item);
                }
                if (item.items) {
                    matches.push(...findAllItemsByKey(item.items, searchKey));
                }
            }
            return matches;
        };

        const matchingItems = findAllItemsByKey(mergedNavigation.navigation, key);

        if (matchingItems.length === 0) {
            return undefined;
        }

        // Prefer items with tags first, then editable items, then the first match
        const bestMatch =
            matchingItems.find((item) => item.tags) || matchingItems.find((item) => item.editable) || matchingItems[0];

        const result: { tags?: string; files?: FileReference[] } = {};

        // Extract tags if available
        if (bestMatch.tags) {
            result.tags = bestMatch.tags;
        }

        // Extract files if editable === true
        if (bestMatch.editable === true && bestMatch['files']) {
            result.files = bestMatch['files'];
        }

        return Object.keys(result).length > 0 ? result : undefined;
    }

    /**
     * Main build process - orchestrates the entire FPM documentation generation.
     */
    async build(): Promise<void> {
        this.logger.info('🚀 Starting FPM documentation build...');

        try {
            await this.initializeGitHubConfig();
            const repoPath = await this.cloneOrUpdateRepository();
            const mergedNavigation = await this.loadAndMergeNavigationFiles(repoPath);
            const viewFiles = await this.locateFpmExplorerViewFiles(repoPath);

            if (viewFiles.size === 0) {
                throw new Error('No fpmExplorer view files found');
            }

            const allDocuments = await this.processViewFiles(viewFiles, mergedNavigation);

            if (allDocuments.length === 0) {
                throw new Error('No code snippets extracted from any files');
            }

            await this.generateAndWriteOutput(allDocuments);

            this.logger.info(`🎉 FPM documentation build completed!`);
            this.logger.info(`📊 Total code snippets: ${allDocuments.length}`);
            this.logger.info(`📁 Output file: ${this.outputPath}`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`❌ Build failed: ${errorMessage}`);
            process.exit(1);
        }
    }

    /**
     * Load and merge navigation files.
     *
     * @param repoPath - Path to the repository
     * @returns Merged navigation structure
     */
    private async loadAndMergeNavigationFiles(repoPath: string): Promise<{ navigation: NavigationItem[] }> {
        const navigationModelPath = path.join(
            repoPath,
            'packages/sap.fe.core/test/sap/fe/core/fpmExplorer/model/navigationModel.json'
        );
        const pageConfigurationPath = path.join(
            repoPath,
            'packages/sap.fe.core/test/sap/fe/core/fpmExplorer/model/pageConfiguration.json'
        );

        this.logger.info('🔄 Merging navigation files...');
        const mergedNavigation = await this.mergeNavigationFiles(navigationModelPath, pageConfigurationPath);
        this.logger.info(`✓ Merged navigation with ${mergedNavigation.navigation.length} top-level items`);

        return mergedNavigation;
    }

    /**
     * Process all view files and extract documents.
     *
     * @param viewFiles - Map of view files to process
     * @param mergedNavigation - Merged navigation structure
     * @param mergedNavigation.navigation
     * @returns Array of extracted documents
     */
    private async processViewFiles(
        viewFiles: Map<string, string>,
        mergedNavigation: { navigation: NavigationItem[] }
    ): Promise<FpmDocument[]> {
        const allDocuments: FpmDocument[] = [];

        for (const [fileName, filePath] of viewFiles) {
            const documents = await this.processViewFile(fileName, filePath, mergedNavigation);
            allDocuments.push(...documents);
        }

        return allDocuments;
    }

    /**
     * Process a single view file.
     *
     * @param fileName - Name of the file
     * @param filePath - Full path to the file
     * @param mergedNavigation - Merged navigation structure
     * @param mergedNavigation.navigation
     * @returns Array of extracted documents
     */
    private async processViewFile(
        fileName: string,
        filePath: string,
        mergedNavigation: { navigation: NavigationItem[] }
    ): Promise<FpmDocument[]> {
        this.logger.info(`📝 Processing file: ${fileName}`);
        this.logger.info(`📁 File path: ${filePath}`);

        try {
            const documents = await this.parseXmlFile(filePath);
            const additionalInfo = await this.getAdditionalInfoFromJson(fileName, mergedNavigation);

            this.enrichDocumentsWithAdditionalInfo(documents, additionalInfo);

            this.logger.info(`✓ Extracted ${documents.length} code snippets from ${fileName}`);
            if (documents.length > 0) {
                this.logger.info(`   Example: ${documents[0].title}`);
            }

            return documents;
        } catch (error) {
            this.logger.warn(`Failed to process ${fileName}: ${error.message}`);
            return [];
        }
    }

    /**
     * Enrich documents with additional information from navigation.
     *
     * @param documents - Documents to enrich
     * @param additionalInfo - Additional information to add
     */
    private enrichDocumentsWithAdditionalInfo(
        documents: FpmDocument[],
        additionalInfo: { tags?: string; files?: FileReference[] } | undefined
    ): void {
        if (!additionalInfo) {
            return;
        }

        for (const doc of documents) {
            if (additionalInfo.tags) {
                doc.tags = additionalInfo.tags;
            }
            if (additionalInfo.files) {
                doc.files = additionalInfo.files;
            }
        }

        this.logger.info(`   Additional info: ${JSON.stringify(additionalInfo)}`);
    }

    /**
     * Generate markdown and write to output file.
     *
     * @param documents - Documents to convert to markdown
     */
    private async generateAndWriteOutput(documents: FpmDocument[]): Promise<void> {
        const markdown = await this.generateMarkdown(documents);
        await this.ensureOutputDirectory();
        await fs.writeFile(this.outputPath, markdown, 'utf-8');
    }
}

// Run the builder
if (require.main === module) {
    const logger = new ToolsLogger();
    const builder = new FpmDocumentationBuilder();
    builder.build().catch((error) => {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Build failed: ${errorMessage}`);
        process.exit(1);
    });
}

export { FpmDocumentationBuilder };
