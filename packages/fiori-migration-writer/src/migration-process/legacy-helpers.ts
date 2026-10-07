// CLASSIFICATION: [OPEN]
import { join, resolve, relative } from 'node:path';
import { existsSync } from 'node:fs';
import { CommandRunner } from '@sap-ux/nodejs-utils';
import { DirName } from '../project-spec-types.js';
import { TemplateFileName } from '../index.js';
import { isMemFsEnabled, getCurrentEditor, exists } from '../utils/fs-adapter.js';

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
    // Ensure it's an existing directory (check real fs, not mem-fs)
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
 * Move folders using mem-fs operations
 * Used in test/preview mode to migrate legacy structure in memory
 *
 * @param rootPath - Project root path
 * @param paths - Legacy paths object
 */
async function memFsMove(rootPath: string, paths: LegacyPaths): Promise<void> {
    const fs = getCurrentEditor();
    if (!fs) {
        return;
    }

    // Move webapp files from src/main/webapp to webapp
    if (exists(paths.ffLegacyWebappPath)) {
        // Get all files from mem-fs store
        // Note: paths in mem-fs might not have leading slash, so normalize
        const allFiles = (fs as any).dump('/');
        const normalizedLegacyPath = paths.ffLegacyWebappPath.startsWith('/')
            ? paths.ffLegacyWebappPath.substring(1)
            : paths.ffLegacyWebappPath;

        const legacyFiles = Object.entries(allFiles).filter(
            ([path]) => path.startsWith(normalizedLegacyPath + '/') || path.startsWith(paths.ffLegacyWebappPath + '/')
        );

        for (const [filePath, _content] of legacyFiles) {
            // Calculate relative path - handle both with and without leading slash
            const basePath = filePath.startsWith(normalizedLegacyPath + '/')
                ? normalizedLegacyPath
                : paths.ffLegacyWebappPath;
            const relativePath = filePath.substring(basePath.length + 1);
            const newPath = join(rootPath, DirName.Webapp, relativePath);

            // Ensure file path has leading slash for fs.read()
            const readPath = filePath.startsWith('/') ? filePath : '/' + filePath;
            const fileContent = fs.read(readPath);
            fs.write(newPath, fileContent);
            fs.delete(readPath);
        }
    }

    // Move test/qunit to webapp/test
    if (exists(paths.ffLegacyTestQunitPath)) {
        const allFiles = (fs as any).dump('/');
        const normalizedLegacyPath = paths.ffLegacyTestQunitPath.startsWith('/')
            ? paths.ffLegacyTestQunitPath.substring(1)
            : paths.ffLegacyTestQunitPath;

        const legacyFiles = Object.entries(allFiles).filter(
            ([path]) =>
                path.startsWith(normalizedLegacyPath + '/') || path.startsWith(paths.ffLegacyTestQunitPath + '/')
        );

        for (const [filePath, _content] of legacyFiles) {
            const basePath = filePath.startsWith(normalizedLegacyPath + '/')
                ? normalizedLegacyPath
                : paths.ffLegacyTestQunitPath;
            const relativePath = filePath.substring(basePath.length + 1);
            const newPath = join(paths.ffNewTestPath, 'qunit', relativePath);

            const readPath = filePath.startsWith('/') ? filePath : '/' + filePath;
            const fileContent = fs.read(readPath);
            fs.write(newPath, fileContent);
            fs.delete(readPath);
        }
    }

    // Move test/uiveri5 to webapp/test
    if (exists(paths.ffLegacyTestuiveri5Path)) {
        const allFiles = (fs as any).dump('/');
        const normalizedLegacyPath = paths.ffLegacyTestuiveri5Path.startsWith('/')
            ? paths.ffLegacyTestuiveri5Path.substring(1)
            : paths.ffLegacyTestuiveri5Path;

        const legacyFiles = Object.entries(allFiles).filter(
            ([path]) =>
                path.startsWith(normalizedLegacyPath + '/') || path.startsWith(paths.ffLegacyTestuiveri5Path + '/')
        );

        for (const [filePath, _content] of legacyFiles) {
            const basePath = filePath.startsWith(normalizedLegacyPath + '/')
                ? normalizedLegacyPath
                : paths.ffLegacyTestuiveri5Path;
            const relativePath = filePath.substring(basePath.length + 1);
            const newPath = join(paths.ffNewTestPath, 'uiveri5', relativePath);

            const readPath = filePath.startsWith('/') ? filePath : '/' + filePath;
            const fileContent = fs.read(readPath);
            fs.write(newPath, fileContent);
            fs.delete(readPath);
        }
    }
}

/**
 * Try to move folders using git to preserve history
 * Uses relative paths from validated root directory to prevent command injection
 *
 * @param rootPath - Project root path
 * @param _paths - Legacy paths object (unused, paths rebuilt internally for security)
 */
export async function tryGitMove(rootPath: string, _paths: LegacyPaths): Promise<void> {
    // In mem-fs mode, use mem-fs operations instead of git
    if (isMemFsEnabled()) {
        await memFsMove(rootPath, _paths);
        return;
    }

    const runner = new CommandRunner();

    try {
        // Validate root directory - this is the only absolute path passed to git (-C option)
        const safeRootPath = validateRootDirectory(rootPath);

        // Rebuild paths from validated root + constants to avoid propagating external path input
        const legacyWebappPath = join(safeRootPath, 'src', 'main', DirName.Webapp);
        const legacyTestQunitPath = join(safeRootPath, 'src', TemplateFileName.Test, 'qunit');
        const legacyTestuiveri5Path = join(safeRootPath, 'src', TemplateFileName.Test, 'uiveri5');
        const newTestPath = join(safeRootPath, DirName.Webapp, TemplateFileName.Test);

        // Calculate and validate relative paths from root
        const relLegacyWebapp = validateGitRelativePath(relative(safeRootPath, legacyWebappPath));
        const relNewWebapp = validateGitRelativePath(DirName.Webapp);
        const relLegacyTestQunit = validateGitRelativePath(relative(safeRootPath, legacyTestQunitPath));
        const relLegacyTestuiveri5 = validateGitRelativePath(relative(safeRootPath, legacyTestuiveri5Path));
        const relNewTest = validateGitRelativePath(relative(safeRootPath, newTestPath));

        // Move main webapp folder (using validated relative paths prevents command injection)
        await runner.run('git', ['-C', safeRootPath, 'mv', '-k', '--', relLegacyWebapp, relNewWebapp]);

        // Move qunit folder if exists
        if (existsSync(legacyTestQunitPath)) {
            await runner.run('git', ['-C', safeRootPath, 'mv', '-k', '--', relLegacyTestQunit, relNewTest]);
        }

        // Move uiveri5 folder if exists
        if (existsSync(legacyTestuiveri5Path)) {
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
export async function fallbackFsMove(rootPath: string, paths: LegacyPaths): Promise<void> {
    // Note: In mem-fs mode, file moves are handled by git (preferred path)
    // This fallback only works for real file system operations
    // Mem-fs doesn't support atomic moves, so this is intentionally a no-op in mem-fs mode
    if (isMemFsEnabled()) {
        // Skip fallback in mem-fs mode - files should have been moved by git
        return;
    }

    // Real file system fallback
    // Use filesystem operations for cleanup
    const { default: fse } = await import('fs-extra');
    if (existsSync(paths.ffLegacyWebappPath)) {
        fse.moveSync(paths.ffLegacyWebappPath, join(rootPath, DirName.Webapp));
    }
    if (existsSync(paths.ffLegacyTestQunitPath)) {
        fse.moveSync(paths.ffLegacyTestQunitPath, paths.ffNewTestPath);
    }
    if (existsSync(paths.ffLegacyTestuiveri5Path)) {
        fse.moveSync(paths.ffLegacyTestuiveri5Path, paths.ffNewTestPath);
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
    // Note: In mem-fs mode, directory removal isn't needed
    // Mem-fs only tracks files, not empty directories
    if (isMemFsEnabled()) {
        return;
    }

    const fs = await import('node:fs');
    const fsextra = await import('fs-extra');

    const dirsToRemove = [join(rootPath, legacyPath), paths.ffLegacyTestPath, join(rootPath, 'src')];

    for (const dir of dirsToRemove) {
        if (existsSync(dir) && fs.default.readdirSync(dir).filter((file) => file !== '.DS_Store').length === 0) {
            fsextra.default.removeSync(dir);
        }
    }
}
