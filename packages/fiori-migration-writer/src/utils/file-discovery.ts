/**
 * Native file discovery utilities
 *
 * Replaces @sap/ux-project-access file discovery functions with native implementations
 * using fast-glob and Node.js fs APIs.
 */

import fastGlob from 'fast-glob';
import { dirname, basename } from 'node:path';
import { readJSON } from './file-access.js';
import type { ProjectFolder } from '../types.js';

/**
 * Reuse library type enum
 * Matches @sap/ux-project-access ReuseLibType
 */
export enum ReuseLibType {
    LIBRARY = 'library',
    COMPONENT = 'component'
}

/**
 * Find all project roots with package.json
 *
 * Replaces: findAllProjectRoots from @sap/ux-project-access
 *
 * @param paths - Array of root paths to search
 * @param sapuxRequired - If true, only return projects with sapux in dependencies
 * @returns Array of project root paths
 */
export async function findAllProjectRoots(paths: string[], sapuxRequired = false): Promise<string[]> {
    const roots: string[] = [];
    const ignorePatterns = ['**/node_modules/**', '**/dist/**', '**/.git/**'];

    for (const searchPath of paths) {
        try {
            // Find all package.json files, excluding node_modules and dist
            const packageJsonFiles = await fastGlob('**/package.json', {
                cwd: searchPath,
                ignore: ignorePatterns,
                absolute: true,
                onlyFiles: true
            });

            for (const pkgPath of packageJsonFiles) {
                const dir = dirname(pkgPath);

                if (sapuxRequired) {
                    try {
                        const pkg = await readJSON<any>(pkgPath);
                        // Check for SAP UX / Fiori Tools markers:
                        // 1. "sapux": true property (Fiori Tools marker)
                        // 2. Dependencies starting with @sap-ux/ or @sap/ux- (Fiori Tools packages)
                        const hasSapux =
                            pkg?.sapux === true ||
                            Object.keys(pkg?.dependencies || {}).some(
                                (dep) => dep.startsWith('@sap-ux/') || dep.startsWith('@sap/ux-')
                            ) ||
                            Object.keys(pkg?.devDependencies || {}).some(
                                (dep) => dep.startsWith('@sap-ux/') || dep.startsWith('@sap/ux-')
                            );

                        if (hasSapux) {
                            roots.push(dir);
                        }
                    } catch {
                        // Invalid package.json, skip
                        continue;
                    }
                } else {
                    roots.push(dir);
                }
            }
        } catch {
            // Expected: path may not exist, may not be readable, or fast-glob may fail on invalid patterns.
            // Safe to skip this path and continue with remaining paths.
            continue;
        }
    }

    // Remove duplicates and sort alphabetically
    return [...new Set(roots)].sort((a, b) => a.localeCompare(b));
}

/**
 * Reuse library result structure
 * Matches @sap/ux-project-access getReuseLibs return type
 */
export interface ReuseLibResult {
    value: {
        libRoot: string;
        path: string;
        name: string;
        type: ReuseLibType;
    };
}

/**
 * Get all reuse libraries from workspace folders
 *
 * Replaces: getReuseLibs from @sap/ux-project-access
 *
 * Searches for UI5 libraries and components by finding manifest.json files
 * with "sap.app.type": "library" or "component"
 *
 * @param workspaceFolders - Array of workspace folders to search
 * @returns Array of reuse library information
 */
export async function getReuseLibs(workspaceFolders: readonly ProjectFolder[]): Promise<ReuseLibResult[]> {
    const libs: ReuseLibResult[] = [];

    for (const folder of workspaceFolders) {
        try {
            // Find all manifest.json files in this workspace folder
            const manifestFiles = await fastGlob('**/manifest.json', {
                cwd: folder.uri.fsPath,
                ignore: ['**/node_modules/**', '**/dist/**', '**/.git/**'],
                absolute: true,
                onlyFiles: true
            });

            for (const manifestPath of manifestFiles) {
                try {
                    const manifest = await readJSON<any>(manifestPath);
                    const sapApp = manifest?.['sap.app'];
                    const type = sapApp?.type;

                    // Only include libraries and components
                    if (type === 'library' || type === 'component') {
                        const libRoot = dirname(manifestPath);
                        const name = sapApp?.id || basename(libRoot);

                        libs.push({
                            value: {
                                libRoot,
                                path: manifestPath,
                                name,
                                type: type === 'library' ? ReuseLibType.LIBRARY : ReuseLibType.COMPONENT
                            }
                        });
                    }
                } catch {
                    // Invalid manifest.json, skip
                    continue;
                }
            }
        } catch {
            // If folder doesn't exist or can't be read, skip it
            continue;
        }
    }

    return libs;
}

/**
 * Find all files matching a pattern in a directory
 *
 * Replaces: findAll from @sap/ux-project-access
 *
 * This is a simple file finder that searches for files with a specific name
 * and returns the directories containing them.
 *
 * @param searchPath - Directory to search
 * @param fileName - Name of file to find
 * @param results - Array to push results into (modified in place)
 * @param ignorePaths - Array of paths to ignore
 */
export async function findAll(
    searchPath: string,
    fileName: string,
    results: string[],
    ignorePaths: string[]
): Promise<void> {
    try {
        // Build ignore patterns
        const ignore = ['**/node_modules/**', '**/dist/**', '**/.git/**', ...ignorePaths];

        // Find all files with the given name
        const files = await fastGlob(`**/${fileName}`, {
            cwd: searchPath,
            ignore,
            absolute: true,
            onlyFiles: true
        });

        // Add the directory containing each file to results
        for (const file of files) {
            const dir = dirname(file);
            if (!results.includes(dir)) {
                results.push(dir);
            }
        }
    } catch {
        // If search path doesn't exist or can't be read, just return empty results
    }
}
