import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { DirName } from '../project-spec-types.js';
import { TemplateFileName } from '../index.js';
import { createDirectory, fileExists, deleteFile } from '../utils/index.js';
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
    // Create localService directory if project has a data source
    if (hasDataSource) {
        await createDirectory(join(rootPath, projectInfo.webappPath, DirName.LocalService));
    }

    // Create test directory if webapp exists
    const webAppPath = join(rootPath, projectInfo.webappPath);
    if (existsSync(webAppPath)) {
        await createDirectory(join(rootPath, projectInfo.webappPath, TemplateFileName.Test));
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
            await deleteFile(packageLockPath);
        }
    } catch {
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
