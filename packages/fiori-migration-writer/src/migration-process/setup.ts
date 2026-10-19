import { join } from 'node:path';
import { fileExists, deleteFile } from '../utils/index.js';
import { createDirectory, doesDirectoryExists } from '../utils/file-system-utils.js';
import { DirName } from '../project-spec-types.js';
import type { ImportProjectInfo } from '../types.js';

/**
 * Sets up necessary directories for migration
 * Creates localService directory if data source exists, and test directory if webapp exists
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
    if (hasDataSource) {
        await createDirectory(join(rootPath, projectInfo.webappPath, DirName.LocalService));
    }
    const webAppPath = join(rootPath, projectInfo.webappPath);
    if (doesDirectoryExists(webAppPath)) {
        await createDirectory(join(rootPath, projectInfo.webappPath, DirName.Test));
    }
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
