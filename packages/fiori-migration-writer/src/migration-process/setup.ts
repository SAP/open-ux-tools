import { join } from 'node:path';
import type { Editor } from 'mem-fs-editor';
import { fileExists, deleteFile } from '../utils/index.js';
import { createDirectory, doesDirectoryExists } from '../utils/file-system-utils.js';
import { DirName } from '../project-spec-types.js';
import type { ImportProjectInfo } from '../types.js';

/**
 * Sets up necessary directories for migration
 * Creates localService directory if data source exists, and test directory if webapp exists
 *
 * @param fs - mem-fs editor
 * @param projectInfo - Project information
 * @param rootPath - Root path of the project
 * @param hasDataSource - Whether project has a data source
 */
export async function setupMigrationDirectories(
    fs: Editor,
    projectInfo: ImportProjectInfo,
    rootPath: string,
    hasDataSource: boolean
): Promise<void> {
    if (hasDataSource) {
        await createDirectory(join(rootPath, projectInfo.webappPath, DirName.LocalService), fs);
    }
    const webAppPath = join(rootPath, projectInfo.webappPath);
    if (doesDirectoryExists(webAppPath, fs)) {
        await createDirectory(join(rootPath, projectInfo.webappPath, DirName.Test), fs);
    }
}

/**
 * Removes package-lock.json if it exists
 * Package-lock is regenerated during installation
 *
 * @param fs - mem-fs editor
 * @param rootPath - Root path of the project
 */
export function removePackageLock(fs: Editor, rootPath: string): void {
    try {
        const packageLockPath = join(rootPath, 'package-lock.json');
        if (fileExists(fs, packageLockPath)) {
            deleteFile(fs, packageLockPath);
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
