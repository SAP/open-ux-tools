import { join, relative, sep } from 'node:path';
import { access, readdir } from 'node:fs/promises';
import { CommandRunner } from '@sap-ux/nodejs-utils';
import { DirName } from '../project-spec-types.js';
import { TemplateFileName } from '../index.js';
import { isMemFsEnabled, getCurrentEditor, exists } from '../utils/fs-adapter.js';
import { validateRootDirectory, validateGitRelativePath } from '../utils/path-validation.js';
import { hasStore } from '../types/mem-fs-types.js';

// Re-export for backward compatibility with tests
export { validateRootDirectory } from '../utils/path-validation.js';

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
    if (!fs || !hasStore(fs)) {
        return;
    }

    // Move webapp files from src/main/webapp to webapp
    if (await exists(paths.ffLegacyWebappPath)) {
        // Iterate through all files in mem-fs store
        // mem-fs stores files with absolute paths as keys
        const filesToMove: Array<{ oldPath: string; newPath: string }> = [];

        fs.store.each((file) => {
            const filePath = file.path;

            // Check if this file is under the legacy webapp path.
            // mem-fs keys use the OS-native separator, so compare with `sep` (not a hardcoded '/')
            // or the match fails on Windows and no files are moved.
            if (filePath === paths.ffLegacyWebappPath || filePath.startsWith(paths.ffLegacyWebappPath + sep)) {
                // Calculate relative path from legacy webapp
                const relativePath =
                    filePath === paths.ffLegacyWebappPath
                        ? ''
                        : filePath.substring(paths.ffLegacyWebappPath.length + 1);
                const newPath = relativePath
                    ? join(rootPath, DirName.Webapp, relativePath)
                    : join(rootPath, DirName.Webapp);

                filesToMove.push({ oldPath: filePath, newPath });
            }
        });

        // Move files (do this after iteration to avoid modifying during iteration)
        for (const { oldPath, newPath } of filesToMove) {
            const fileContent = fs.read(oldPath);
            fs.write(newPath, fileContent);
            fs.delete(oldPath);
        }
    }

    // Move test/qunit to webapp/test
    if (await exists(paths.ffLegacyTestQunitPath)) {
        const filesToMove: Array<{ oldPath: string; newPath: string }> = [];

        fs.store.each((file) => {
            const filePath = file.path;

            if (filePath === paths.ffLegacyTestQunitPath || filePath.startsWith(paths.ffLegacyTestQunitPath + sep)) {
                const relativePath =
                    filePath === paths.ffLegacyTestQunitPath
                        ? ''
                        : filePath.substring(paths.ffLegacyTestQunitPath.length + 1);
                const newPath = relativePath
                    ? join(paths.ffNewTestPath, 'qunit', relativePath)
                    : join(paths.ffNewTestPath, 'qunit');

                filesToMove.push({ oldPath: filePath, newPath });
            }
        });

        for (const { oldPath, newPath } of filesToMove) {
            const fileContent = fs.read(oldPath);
            fs.write(newPath, fileContent);
            fs.delete(oldPath);
        }
    }

    // Move test/uiveri5 to webapp/test
    if (await exists(paths.ffLegacyTestuiveri5Path)) {
        const filesToMove: Array<{ oldPath: string; newPath: string }> = [];

        fs.store.each((file) => {
            const filePath = file.path;

            if (
                filePath === paths.ffLegacyTestuiveri5Path ||
                filePath.startsWith(paths.ffLegacyTestuiveri5Path + sep)
            ) {
                const relativePath =
                    filePath === paths.ffLegacyTestuiveri5Path
                        ? ''
                        : filePath.substring(paths.ffLegacyTestuiveri5Path.length + 1);
                const newPath = relativePath
                    ? join(paths.ffNewTestPath, 'uiveri5', relativePath)
                    : join(paths.ffNewTestPath, 'uiveri5');

                filesToMove.push({ oldPath: filePath, newPath });
            }
        });

        for (const { oldPath, newPath } of filesToMove) {
            const fileContent = fs.read(oldPath);
            fs.write(newPath, fileContent);
            fs.delete(oldPath);
        }
    }
}

/**
 * Helper function to check if a path exists on real filesystem (async)
 */
async function pathExistsOnDisk(path: string): Promise<boolean> {
    try {
        await access(path);
        return true;
    } catch {
        return false;
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
        const safeRootPath = await validateRootDirectory(rootPath);

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
        if (await pathExistsOnDisk(legacyTestQunitPath)) {
            await runner.run('git', ['-C', safeRootPath, 'mv', '-k', '--', relLegacyTestQunit, relNewTest]);
        }

        // Move uiveri5 folder if exists
        if (await pathExistsOnDisk(legacyTestuiveri5Path)) {
            await runner.run('git', ['-C', safeRootPath, 'mv', '-k', '--', relLegacyTestuiveri5, relNewTest]);
        }
    } catch (error: unknown) {
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
    if (await pathExistsOnDisk(paths.ffLegacyWebappPath)) {
        fse.moveSync(paths.ffLegacyWebappPath, join(rootPath, DirName.Webapp));
    }
    if (await pathExistsOnDisk(paths.ffLegacyTestQunitPath)) {
        fse.moveSync(paths.ffLegacyTestQunitPath, paths.ffNewTestPath);
    }
    if (await pathExistsOnDisk(paths.ffLegacyTestuiveri5Path)) {
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

    const fsextra = await import('fs-extra');

    const dirsToRemove = [join(rootPath, legacyPath), paths.ffLegacyTestPath, join(rootPath, 'src')];

    for (const dir of dirsToRemove) {
        if (await pathExistsOnDisk(dir)) {
            const dirContents = await readdir(dir);
            if (dirContents.filter((file) => file !== '.DS_Store').length === 0) {
                fsextra.default.removeSync(dir);
            }
        }
    }
}
