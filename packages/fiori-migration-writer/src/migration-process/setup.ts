import { join } from 'node:path';
import { DirName } from '../project-spec-types.js';
import { TemplateFileName } from '../index.js';
import { fileExists, deleteFile } from '../utils/index.js';
import type { ImportProjectInfo } from '../types.js';

/**
 * Sets up necessary directories for migration
 * Note: mem-fs handles directory creation implicitly when files are written
 *
 * @param projectInfo - Project information
 * @param rootPath - Root path of the project
 * @param hasDataSource - Whether project has a data source
 */
export async function setupMigrationDirectories(
    projectInfo: ImportProjectInfo,
    rootPath: string,
    hasDataSource: boolean
): Promise<void> {
    // mem-fs handles directory creation implicitly when files are written to paths
    // No explicit directory creation needed
}

/**
 * Removes package-lock.json if it exists
 * Package-lock is regenerated during installation
 *
 * @param rootPath - Root path of the project
 */
export async function removePackageLock(rootPath: string): Promise<void> {
    try {
        const packageLockPath = join(rootPath, 'package-lock.json');
        if (await fileExists(packageLockPath)) {
            deleteFile(packageLockPath);
        }
    } catch (error: unknown) {
        // Expected: package-lock.json deletion may fail due to file permissions or if file is locked.
        // Non-critical - package-lock.json will be regenerated on npm install. Safe to continue.
    }
}

/**
 * Determines the source template type for manifest.json
 *
 * @param projectInfo - Project information
 * @param MigrationTypesEnum - MigrationTypes enum
 * @returns Source template type string
 */
export function determineSourceTemplateType(projectInfo: ImportProjectInfo, MigrationTypesEnum: any): string {
    let sourceTemplateType = projectInfo.floorPlan || projectInfo.isSAPApp ? 'freestyle' : 'unknown';
    sourceTemplateType = projectInfo.type === MigrationTypesEnum.projectExtension ? 'extension' : sourceTemplateType;
    return sourceTemplateType;
}
