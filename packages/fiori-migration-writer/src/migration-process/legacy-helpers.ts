// CLASSIFICATION: [OPEN]
import { join, resolve, relative } from 'node:path';
import { existsSync } from 'node:fs';
import fsextra from 'fs-extra';
import { CommandRunner } from '@sap-ux/nodejs-utils';
import { DirName } from '../project-spec-types.js';
import { TemplateFileName } from '../index.js';

/**
 * Validates the root directory path before using as working directory
 * Rejects paths with control characters that could enable command injection
 *
 * @param path - Root directory path to validate
 * @returns Validated absolute path
 * @throws Error if path contains unsafe characters or is not a directory
 */
export function validateRootDirectory(path: string): string {
    const resolved = resolve(path);
    // Reject control characters and shell metacharacters
    if (/[\0\r\n`$|&;<>]/.test(resolved)) {
        throw new Error('Path contains unsafe characters');
    }
    // Ensure it's an existing directory
    if (!existsSync(resolved)) {
        throw new Error('Root directory does not exist');
    }
    return resolved;
}

/**
 * Validates a relative path to ensure it's safe for git commands
 * Rejects paths that escape the root or contain unsafe characters
 *
 * @param relPath - Relative path from relative()
 * @returns The same path if safe
 * @throws Error if path is unsafe
 */
function validateGitRelativePath(relPath: string): string {
    // Reject empty or root-level paths
    if (!relPath || relPath === '.') {
        throw new Error('Git path cannot be empty or root');
    }
    // Reject paths that escape the root
    if (relPath.startsWith('..') || relPath.includes('/..') || relPath.includes('\\..')) {
        throw new Error('Git path escapes root directory');
    }
    // Reject control characters
    if (/[\0\r\n]/.test(relPath)) {
        throw new Error('Git path contains control characters');
    }
    return relPath;
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
 * Uses relative paths from validated root directory to prevent command injection
 *
 * @param rootPath - Project root path
 * @param paths - Legacy paths object
 */
export async function tryGitMove(rootPath: string, paths: LegacyPaths): Promise<void> {
    const runner = new CommandRunner();

    try {
        // Validate root directory - this is the only absolute path passed to git (-C option)
        const safeRootPath = validateRootDirectory(rootPath);

        // Calculate and validate relative paths from root
        const relLegacyWebapp = validateGitRelativePath(relative(safeRootPath, paths.ffLegacyWebappPath));
        const relNewWebapp = validateGitRelativePath(DirName.Webapp);
        const relLegacyTestQunit = validateGitRelativePath(relative(safeRootPath, paths.ffLegacyTestQunitPath));
        const relLegacyTestuiveri5 = validateGitRelativePath(relative(safeRootPath, paths.ffLegacyTestuiveri5Path));
        const relNewTest = validateGitRelativePath(relative(safeRootPath, paths.ffNewTestPath));

        // Move main webapp folder (using validated relative paths prevents command injection)
        await runner.run('git', ['-C', safeRootPath, 'mv', '-k', '--', relLegacyWebapp, relNewWebapp]);

        // Move qunit folder if exists
        if (existsSync(paths.ffLegacyTestQunitPath)) {
            await runner.run('git', ['-C', safeRootPath, 'mv', '-k', '--', relLegacyTestQunit, relNewTest]);
        }

        // Move uiveri5 folder if exists
        if (existsSync(paths.ffLegacyTestuiveri5Path)) {
            await runner.run('git', ['-C', safeRootPath, 'mv', '-k', '--', relLegacyTestuiveri5, relNewTest]);
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
