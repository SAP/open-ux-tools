// CLASSIFICATION: [OPEN]
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import fsextra from 'fs-extra';
import { CommandRunner } from '@sap-ux/nodejs-utils';
import { DirName } from '../project-spec-types.js';
import { TemplateFileName } from '../index.js';

/**
 * Build legacy folder paths for migration
 */
export interface LegacyPaths {
    ffLegacyTestPath: string;
    ffLegacyTestQunitPath: string;
    ffLegacyTestuiveri5Path: string;
    ffLegacyWebappPath: string;
    ffNewTestPath: string;
}

/**
 * Build all legacy and target paths
 *
 * @param rootPath - Project root path
 * @param legacyPath - Legacy path (src/main)
 * @returns Object containing all relevant paths
 */
export function buildLegacyPaths(rootPath: string, legacyPath: string): LegacyPaths {
    return {
        ffLegacyTestPath: join(rootPath, 'src', TemplateFileName.Test),
        ffLegacyTestQunitPath: join(rootPath, 'src', TemplateFileName.Test, 'qunit'),
        ffLegacyTestuiveri5Path: join(rootPath, 'src', TemplateFileName.Test, 'uiveri5'),
        ffLegacyWebappPath: join(rootPath, legacyPath, DirName.Webapp),
        ffNewTestPath: join(rootPath, DirName.Webapp, TemplateFileName.Test)
    };
}

/**
 * Try to move folders using git to preserve history
 *
 * @param rootPath - Project root path
 * @param paths - Legacy paths object
 */
export async function tryGitMove(rootPath: string, paths: LegacyPaths): Promise<void> {
    const runner = new CommandRunner();

    try {
        // Move main webapp folder
        await runner.run('git', ['-C', rootPath, 'mv', '-k', paths.ffLegacyWebappPath, join(rootPath, DirName.Webapp)]);

        // Move qunit folder if exists
        if (existsSync(paths.ffLegacyTestQunitPath)) {
            await runner.run('git', ['-C', rootPath, 'mv', '-k', paths.ffLegacyTestQunitPath, paths.ffNewTestPath]);
        }

        // Move uiveri5 folder if exists
        if (existsSync(paths.ffLegacyTestuiveri5Path)) {
            await runner.run('git', ['-C', rootPath, 'mv', '-k', paths.ffLegacyTestuiveri5Path, paths.ffNewTestPath]);
        }
    } catch {
        // git might not be available or move failed - fallback will handle it
    }
}

/**
 * Fallback folder move using node fs
 *
 * @param rootPath - Project root path
 * @param paths - Legacy paths object
 */
export function fallbackFsMove(rootPath: string, paths: LegacyPaths): void {
    if (existsSync(paths.ffLegacyWebappPath)) {
        fsextra.moveSync(paths.ffLegacyWebappPath, join(rootPath, DirName.Webapp));
    }
    if (existsSync(paths.ffLegacyTestQunitPath)) {
        fsextra.moveSync(paths.ffLegacyTestQunitPath, paths.ffNewTestPath);
    }
    if (existsSync(paths.ffLegacyTestuiveri5Path)) {
        fsextra.moveSync(paths.ffLegacyTestuiveri5Path, paths.ffNewTestPath);
    }
}

/**
 * Remove empty legacy directories
 *
 * @param rootPath - Project root path
 * @param legacyPath - Legacy path (src/main)
 * @param paths - Legacy paths object
 */
export async function cleanupEmptyDirs(rootPath: string, legacyPath: string, paths: LegacyPaths): Promise<void> {
    const fs = await import('node:fs');

    const dirsToRemove = [join(rootPath, legacyPath), paths.ffLegacyTestPath, join(rootPath, 'src')];

    for (const dir of dirsToRemove) {
        if (existsSync(dir) && fs.default.readdirSync(dir).filter((file) => file !== '.DS_Store').length === 0) {
            fsextra.removeSync(dir);
        }
    }
}
