import { getVariant, type DescriptorVariant } from '@sap-ux/adp-tooling';
import { join, relative } from 'node:path';
import { existsSync } from 'node:fs';
import { promises as FSpromises } from 'node:fs';
import { logger } from '../../utils/logger';

export interface ExtractedFile {
    path: string;
    code: string;
}

/**
 * Extracts files from AI response containing markdown code blocks with Path markers.
 *
 * @param content - The AI response content with markdown code blocks
 * @returns Array of extracted files with path and code
 */
export function extractFilesFromResponse(content: string): ExtractedFile[] {
    const codeBlocks: ExtractedFile[] = [];
    const lines = content.split('\n');
    let currentPath = '';
    let inCodeBlock = false;
    let currentCode = '';

    for (const line of lines) {
        const pathMatch = line.match(/\*\*Path:\*\*\s*(.+)/);
        if (pathMatch) {
            currentPath = pathMatch[1].trim();
            continue;
        }

        if (line.match(/^```(\w+)?/) && !inCodeBlock) {
            inCodeBlock = true;
            currentCode = '';
            continue;
        }

        if (line.startsWith('```') && inCodeBlock) {
            inCodeBlock = false;
            if (currentPath && currentCode.trim()) {
                codeBlocks.push({
                    path: currentPath,
                    code: currentCode.trim()
                });
            }
            currentPath = '';
            currentCode = '';
            continue;
        }

        if (inCodeBlock) {
            currentCode += line + '\n';
        }
    }

    return codeBlocks;
}

/**
 * Checks if the file path is a change file.
 *
 * @param filePath - The file path to check
 * @returns True if the file is a change file
 */
export function isChangeFile(filePath: string): boolean {
    return filePath.toLowerCase().endsWith('.change');
}

/**
 * Gets the project folder name from app path.
 *
 * @param appPath - The application path
 * @returns The project folder name
 */
export function getProjectFolderName(appPath: string): string {
    const pathParts = appPath.split(/[/\\]/).filter((part) => part.length > 0);
    return pathParts[pathParts.length - 1] || '';
}

/**
 * Reads the manifest.appdescr_variant file.
 *
 * @param appPath - The application path
 * @returns The DescriptorVariant object
 */
export async function readManifestVariant(appPath: string): Promise<DescriptorVariant> {
    return getVariant(appPath);
}

/**
 * Checks if the project is an adaptation project by looking for manifest.appdescr_variant.
 *
 * @param appPath - The application path
 * @returns True if it's an adaptation project
 */
export function isAdaptationProject(appPath: string): boolean {
    const manifestVariantPath = join(appPath, 'webapp', 'manifest.appdescr_variant');
    return existsSync(manifestVariantPath);
}

export interface ExistingProjectFile {
    relativePath: string;
    content: string;
}

const SCANNABLE_EXTENSIONS = new Set(['.js', '.ts', '.xml', '.json']);
const MAX_FILE_SIZE = 50 * 1024; // 50KB limit per file

/**
 * Scans the webapp/changes directory for existing controller extensions and fragments.
 *
 * @param appPath - The application root path
 * @returns Array of existing project files with their relative paths and content
 */
export async function scanExistingProjectFiles(appPath: string): Promise<ExistingProjectFile[]> {
    const changesDir = join(appPath, 'webapp', 'changes');
    const files: ExistingProjectFile[] = [];

    if (!existsSync(changesDir)) {
        return files;
    }

    await collectFiles(changesDir, appPath, files);
    return files;
}

async function collectFiles(dir: string, appPath: string, files: ExistingProjectFile[]): Promise<void> {
    let entries;
    try {
        entries = await FSpromises.readdir(dir, { withFileTypes: true });
    } catch {
        return;
    }

    for (const entry of entries) {
        const fullPath = join(dir, entry.name);

        if (entry.isDirectory()) {
            await collectFiles(fullPath, appPath, files);
            continue;
        }

        if (!entry.isFile()) {
            continue;
        }

        const ext = entry.name.slice(entry.name.lastIndexOf('.'));
        if (!SCANNABLE_EXTENSIONS.has(ext) || isChangeFile(entry.name)) {
            continue;
        }

        try {
            const stat = await FSpromises.stat(fullPath);
            if (stat.size > MAX_FILE_SIZE) {
                continue;
            }
            const content = await FSpromises.readFile(fullPath, 'utf-8');
            files.push({ relativePath: relative(appPath, fullPath), content });
        } catch {
            logger.debug(`Could not read file: ${fullPath}`);
        }
    }
}

export { logger };
