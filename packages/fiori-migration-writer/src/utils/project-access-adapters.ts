/**
 * Adapters for @sap-ux/project-access that provide missing APIs
 * or compatibility with legacy @sap/ux-project-access
 */
import { hasDependency, findFilesByExtension } from '@sap-ux/project-access';
import { readJSON } from './file-access.js';
import { dirname, join, sep } from 'node:path';

/**
 * Find all manifest.json files in given workspace roots
 *
 * Uses modern @sap-ux/project-access findFilesByExtension
 *
 * @param roots - Array of workspace root paths
 * @returns Array of project root paths (directories containing manifest.json)
 */
export async function findAllManifest(roots: string[]): Promise<string[]> {
    const results: string[] = [];

    for (const root of roots) {
        try {
            // Find all .json files
            const jsonFiles = await findFilesByExtension('json', root, []);

            // Filter for manifest.json specifically
            const manifestPaths = jsonFiles
                .filter((filePath) => filePath.endsWith('manifest.json'))
                .map((filePath) => dirname(filePath))
                // Filter out webapp subdirectories
                .filter((dirPath) => !dirPath.endsWith(`${sep}webapp`));

            results.push(...manifestPaths);
        } catch (error) {
            console.error(`Error finding manifests in ${root}:`, error);
        }
    }

    return [...new Set(results)];
}

/**
 * Check if a project is a Fiori Tools project
 *
 * Uses modern @sap-ux/project-access hasDependency
 *
 * @param projectPath - Path to project root
 * @param dependencyName - Dependency name to check
 * @returns true if project has the dependency
 */
export async function isFioriToolsProject(projectPath: string, dependencyName: string): Promise<boolean> {
    try {
        const packageJsonPath = join(projectPath, 'package.json');
        const packageJson = await readJSON(packageJsonPath);
        return hasDependency(packageJson, dependencyName);
    } catch {
        return false;
    }
}
