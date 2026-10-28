/**
 * Native file discovery utilities
 *
 * Replaces @sap/ux-project-access file discovery functions with native implementations
 * using fast-glob and Node.js fs APIs.
 */

import fastGlob from 'fast-glob';
import { dirname, basename, join, normalize } from 'node:path';
import { access } from 'node:fs/promises';
import type { Editor } from 'mem-fs-editor';
import { readJSON } from './file-access.js';
import { normalizePath } from './file-system-utils.js';
import type { ProjectFolder } from '../types.js';

/**
 * Reuse library type enum
 * Matches @sap/ux-project-access ReuseLibType
 */
export const ReuseLibType = {
    LIBRARY: 'library',
    COMPONENT: 'component'
} as const;
export type ReuseLibType = (typeof ReuseLibType)[keyof typeof ReuseLibType];

/**
 * Find all project roots with package.json
 *
 * Replaces: findAllProjectRoots from @sap/ux-project-access
 *
 * @param fs - mem-fs editor
 * @param paths - Array of root paths to search
 * @param sapuxRequired - If true, only return projects with sapux in dependencies
 * @returns Array of project root paths
 */
export async function findAllProjectRoots(fs: Editor, paths: string[], sapuxRequired = false): Promise<string[]> {
    const roots: string[] = [];
    const ignorePatterns = ['**/node_modules/**', '**/dist/**', '**/.git/**'];

    // Process all search paths in parallel for better performance
    const pathResults = await Promise.all(
        paths.map(async (searchPath) => {
            try {
                // Find all package.json files, excluding node_modules and dist
                const packageJsonFiles = await fastGlob('**/package.json', {
                    cwd: searchPath,
                    ignore: ignorePatterns,
                    absolute: true,
                    onlyFiles: true
                });

                // Read all package.json files in parallel for better performance
                const checkResults = await Promise.all(
                    packageJsonFiles.map(async (pkgPath) => {
                        // fast-glob always returns POSIX separators; normalize to the OS-native
                        // form so results match paths callers build with path.join (fails on Windows otherwise).
                        const dir = normalize(dirname(pkgPath));

                        if (sapuxRequired) {
                            try {
                                const pkg = await readJSON<any>(fs, pkgPath);
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

                                return hasSapux ? dir : null;
                            } catch {
                                // Expected: package.json may be malformed or unreadable in some projects.
                                // Safe to skip - project will not be included in results.
                                return null;
                            }
                        } else {
                            return dir;
                        }
                    })
                );

                // Return non-null results
                return checkResults.filter((r): r is string => r !== null);
            } catch {
                // Expected: search path may not exist, may not be accessible, or fast-glob may fail on invalid patterns.
                // Safe to skip this path and continue scanning remaining paths - partial results are still useful.
                return [];
            }
        })
    );

    // Flatten results from all paths
    roots.push(...pathResults.flat());

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
 * Find the project root for a library by walking up from manifest directory
 *
 * Walks up from the manifest.json directory until it finds project root markers
 * or reaches the workspace boundary. This ensures we use the actual project root
 * even when workspace folders are not at the project level.
 *
 * @param manifestPath - Path to the library's manifest.json
 * @param workspaceBoundary - Workspace folder root (don't search above this)
 * @returns Project root directory
 */
async function findLibraryProjectRoot(manifestPath: string, workspaceBoundary: string): Promise<string> {
    let current = dirname(manifestPath);
    // Normalize paths for comparison
    const normalizedBoundary = normalizePath(workspaceBoundary);
    const normalizedCurrent = (path: string) => normalizePath(path);

    // Helper to check if a file/directory exists using Node.js fs API
    // (not mem-fs, since project markers are real filesystem entries)
    const pathExists = async (path: string): Promise<boolean> => {
        try {
            await access(path);
            return true;
        } catch {
            // Expected: file/directory may not exist (ENOENT) or may not be accessible (EACCES).
            // This is the standard pattern for existence checks - return false for any access failure.
            return false;
        }
    };

    // Walk up from manifest directory until we find a project root marker or reach above workspace boundary
    while (true) {
        const norm = normalizedCurrent(current);

        // Stop if we've gone above the workspace boundary
        if (!norm.startsWith(normalizedBoundary)) {
            break;
        }

        // Check for project root markers in parallel using Promise.all
        // for better performance (4 sequential awaits per loop iteration → 1 parallel check)
        const [hasGit, hasPackageJson, hasProjectJson, hasPomXml] = await Promise.all([
            pathExists(join(current, '.git')),
            pathExists(join(current, 'package.json')),
            pathExists(join(current, '.project.json')),
            pathExists(join(current, 'pom.xml'))
        ]);

        if (hasGit || hasPackageJson || hasProjectJson || hasPomXml) {
            return current;
        }

        const parent = dirname(current);
        if (parent === current) {
            break; // Reached filesystem root
        }
        current = parent;
    }

    // Default to workspace boundary if no markers found
    return workspaceBoundary;
}

/**
 * Get all reuse libraries from workspace folders
 *
 * Replaces: getReuseLibs from @sap/ux-project-access
 *
 * Searches for UI5 libraries and components by finding manifest.json files
 * with "sap.app.type": "library" or "component"
 *
 * @param fs - mem-fs editor
 * @param workspaceFolders - Array of workspace folders to search
 * @returns Array of reuse library information
 */
export async function getReuseLibs(fs: Editor, workspaceFolders: readonly ProjectFolder[]): Promise<ReuseLibResult[]> {
    // Process all workspace folders in parallel
    const folderResults = await Promise.all(
        workspaceFolders.map(async (folder) => {
            try {
                // Find all manifest.json files in this workspace folder
                const manifestFiles = await fastGlob('**/manifest.json', {
                    cwd: folder.uri.fsPath,
                    ignore: ['**/node_modules/**', '**/dist/**', '**/.git/**'],
                    absolute: true,
                    onlyFiles: true
                });

                // Process all manifests in parallel
                const manifestResults = await Promise.all(
                    manifestFiles.map(async (rawManifestPath) => {
                        // fast-glob always returns POSIX separators; normalize to the OS-native form
                        // so paths match what callers build with path.join (fails on Windows otherwise).
                        const manifestPath = normalize(rawManifestPath);
                        try {
                            const manifest = await readJSON<any>(fs, manifestPath);
                            const sapApp = manifest?.['sap.app'];
                            const type = sapApp?.type;

                            // Only include libraries and components
                            if (type === 'library' || type === 'component') {
                                // Find the actual project root by walking up from manifest directory.
                                // For UI5 libraries, manifest.json is nested in the source tree following
                                // namespace structure (e.g., src/sap/company/lib/name/manifest.json),
                                // but configuration files (package.json, ui5.yaml) must be at project root.
                                // We walk up to find markers (.git, package.json, etc.) to determine the
                                // actual project root, rather than assuming the workspace folder is correct.
                                const libRoot = await findLibraryProjectRoot(manifestPath, folder.uri.fsPath);

                                // Use sap.app.id as the library name (e.g., "sap.company.lib.mylib"),
                                // falling back to the manifest directory's basename if id is missing.
                                // Note: sapApp.id is a namespace identifier used for module naming in UI5,
                                // not a file path. It does NOT imply that the folder structure must match
                                // the namespace components. The libRoot (found above) is the actual project
                                // root location; the name is only used for metadata (e.g., ui5.yaml name field).
                                const name = sapApp?.id || basename(dirname(manifestPath));

                                return {
                                    value: {
                                        libRoot,
                                        path: manifestPath,
                                        name,
                                        type: type === 'library' ? ReuseLibType.LIBRARY : ReuseLibType.COMPONENT
                                    }
                                };
                            }
                            return null;
                        } catch {
                            // Expected: manifest.json may be malformed JSON or unreadable in some library projects.
                            // Safe to skip - library will not be included in reuse library results.
                            return null;
                        }
                    })
                );

                // Filter out nulls
                return manifestResults.filter((result): result is ReuseLibResult => result !== null);
            } catch {
                // Expected: workspace folder may not exist, may not be accessible, or fast-glob may fail.
                // Safe to skip - continue scanning remaining workspace folders for reuse libraries.
                return [];
            }
        })
    );

    // Flatten results from all folders
    return folderResults.flat();
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
            // fast-glob always returns POSIX separators; normalize to the OS-native form
            // so results match paths callers build with path.join (fails on Windows otherwise).
            const dir = normalize(dirname(file));
            if (!results.includes(dir)) {
                results.push(dir);
            }
        }
    } catch (error: unknown) {
        // Expected: search path may not exist, may not be accessible, or fast-glob may fail on invalid patterns.
        // Safe to return without adding results - caller receives partial results from other search paths.
    }
}
