// CLASSIFICATION: [OPEN]
import { join, resolve } from 'node:path';
import { existsSync } from 'node:fs';
import fsextra from 'fs-extra';
import { CommandRunner } from '@sap-ux/nodejs-utils';
import { DirName } from '../project-spec-types.js';
import { TemplateFileName } from '../index.js';

/**
 * Validates a path argument before passing it to git command
 * Rejects paths with control characters that could enable shell injection
 *
 * @param path - Path to validate
 * @returns Validated absolute path
 * @throws Error if path contains unsafe characters
 */
function validateGitPathArg(path: string): string {
    const resolved = resolve(path);
    // Reject control characters and shell metacharacters
    if (/[\0\r\n`$|&;<>]/.test(resolved)) {
        throw new Error('Path contains unsafe characters');
    }
    return resolved;
}

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
        // Validate all paths before passing to git commands
        const safeRootPath = validateGitPathArg(rootPath);
        const safeLegacyWebappPath = validateGitPathArg(paths.ffLegacyWebappPath);
        const safeNewWebappPath = validateGitPathArg(join(rootPath, DirName.Webapp));
        const safeLegacyTestQunitPath = validateGitPathArg(paths.ffLegacyTestQunitPath);
        const safeLegacyTestuiveri5Path = validateGitPathArg(paths.ffLegacyTestuiveri5Path);
        const safeNewTestPath = validateGitPathArg(paths.ffNewTestPath);

        // Move main webapp folder
        await runner.run('git', ['-C', safeRootPath, 'mv', '-k', safeLegacyWebappPath, safeNewWebappPath]);

        // Move qunit folder if exists
        if (existsSync(paths.ffLegacyTestQunitPath)) {
            await runner.run('git', ['-C', safeRootPath, 'mv', '-k', safeLegacyTestQunitPath, safeNewTestPath]);
        }

        // Move uiveri5 folder if exists
        if (existsSync(paths.ffLegacyTestuiveri5Path)) {
            await runner.run('git', ['-C', safeRootPath, 'mv', '-k', safeLegacyTestuiveri5Path, safeNewTestPath]);
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
