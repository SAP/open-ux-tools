import { create as createMemFs } from 'mem-fs';
import { create as createEditor, type Editor } from 'mem-fs-editor';
import { join } from 'node:path';
import { readdirSync, statSync, readFileSync } from 'node:fs';

/**
 * Load a test project directory into mem-fs
 *
 * @param projectPath - Path to project directory
 * @returns Mem-fs editor with project loaded
 */
export function loadProjectIntoMemFs(projectPath: string): Editor {
    const store = createMemFs();
    const fs = createEditor(store);

    // Recursively copy project into mem-fs
    copyDirectoryToMemFs(projectPath, projectPath, fs);

    return fs;
}

/**
 * Recursively copy directory contents to mem-fs
 *
 * @param sourcePath - Source directory path
 * @param targetPath - Target path in mem-fs
 * @param fs - Mem-fs editor
 */
function copyDirectoryToMemFs(sourcePath: string, targetPath: string, fs: Editor): void {
    const items = readdirSync(sourcePath);

    for (const item of items) {
        const srcPath = join(sourcePath, item);
        const destPath = join(targetPath, item);
        const stats = statSync(srcPath);

        if (stats.isDirectory()) {
            // Skip node_modules to keep tests fast
            if (item !== 'node_modules' && item !== 'dist' && item !== '.git') {
                copyDirectoryToMemFs(srcPath, destPath, fs);
            }
        } else {
            const content = readFileSync(srcPath);
            fs.write(destPath, content);
        }
    }
}

/**
 * Extract files from mem-fs for verification
 *
 * @param fs - Mem-fs editor
 * @param basePath - Base path to dump from
 * @returns Map of file paths to contents
 */
export function extractFromMemFs(fs: Editor, basePath: string): Record<string, string> {
    const files: Record<string, string> = {};
    const dump = fs.dump(basePath);

    for (const [path, content] of Object.entries(dump)) {
        files[path] = content;
    }

    return files;
}

/**
 * Get file content from mem-fs dump
 *
 * @param fs - Mem-fs editor
 * @param basePath - Base path for the project
 * @param filePath - Relative file path
 * @returns File content or undefined if not found
 */
export function getFileFromMemFs(fs: Editor, basePath: string, filePath: string): string | undefined {
    const fullPath = join(basePath, filePath);
    try {
        return fs.read(fullPath, { raw: false }) as string;
    } catch {
        return undefined;
    }
}

/**
 * Check if file exists in mem-fs
 *
 * @param fs - Mem-fs editor
 * @param basePath - Base path
 * @param filePath - Relative file path
 * @returns True if file exists
 */
export function fileExistsInMemFs(fs: Editor, basePath: string, filePath: string): boolean {
    const fullPath = join(basePath, filePath);
    return fs.exists(fullPath);
}
