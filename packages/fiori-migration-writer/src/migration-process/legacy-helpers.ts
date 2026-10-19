import { join, relative, sep } from 'node:path';
import { access, readdir } from 'node:fs/promises';
import { CommandRunner } from '@sap-ux/nodejs-utils';
import { DirName } from '../project-spec-types.js';
import { TemplateFileName } from '../index.js';
import { isMemFsEnabled, getCurrentEditor, exists } from '../utils/fs-adapter.js';
import { validateRootDirectory, validateGitRelativePath } from '../utils/path-validation.js';
import { hasStore, type EditorWithStore } from '../types/mem-fs-types.js';

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
/**
 * Move all mem-fs files rooted at `fromPath` to be rooted at `toPath`.
 * Iterates the store after collecting to avoid modifying during iteration.
 *
 * mem-fs keys use the OS-native separator, so comparisons use `sep`.
 *
 * @param fs
 * @param fromPath
 * @param toPath
 */
function moveMemFsDirectory(fs: EditorWithStore, fromPath: string, toPath: string): void {
    const filesToMove: Array<{ oldPath: string; newPath: string }> = [];

    fs.store.each((file) => {
        const filePath = file.path;
        if (filePath === fromPath || filePath.startsWith(fromPath + sep)) {
            const relativePath = filePath === fromPath ? '' : filePath.substring(fromPath.length + 1);
            const newPath = relativePath ? join(toPath, relativePath) : toPath;
            filesToMove.push({ oldPath: filePath, newPath });
        }
    });

    for (const { oldPath, newPath } of filesToMove) {
        const fileContent = fs.read(oldPath);
        fs.write(newPath, fileContent);
        fs.delete(oldPath);
    }
}

async function memFsMove(rootPath: string, paths: LegacyPaths): Promise<void> {
    const editor = getCurrentEditor();
    if (!editor || !hasStore(editor)) {
        return;
    }

    // Move webapp files from src/main/webapp to webapp
    if (await exists(paths.ffLegacyWebappPath)) {
        moveMemFsDirectory(editor, paths.ffLegacyWebappPath, join(rootPath, DirName.Webapp));
    }

    // Move test/qunit to webapp/test (replacing the test path, not nesting under qunit)
    if (await exists(paths.ffLegacyTestQunitPath)) {
        moveMemFsDirectory(editor, paths.ffLegacyTestQunitPath, paths.ffNewTestPath);
    }

    // Move test/uiveri5 to webapp/test/uiveri5
    if (await exists(paths.ffLegacyTestuiveri5Path)) {
        moveMemFsDirectory(editor, paths.ffLegacyTestuiveri5Path, join(paths.ffNewTestPath, 'uiveri5'));
    }
}

/**
 * Helper function to check if a path exists on real filesystem (async)
 *
 * @param path
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
    // In mem-fs mode, also perform mem-fs operations to keep the in-memory store consistent
    if (isMemFsEnabled()) {
        await memFsMove(rootPath, _paths);
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

        // Security: Safe from command injection because:
        // 1. validateGitRelativePath allowlists only safe characters (no shell metacharacters)
        // 2. CommandRunner.run uses spawn with array args (no shell interpolation)
        // 3. '--' separator prevents option injection
        // codeql[js/shell-command-constructed-from-input] - paths validated via allowlist

        // Move main webapp folder
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
    // Real file system fallback - always runs to clean up legacy structure from disk.
    // In mem-fs mode the new files are already staged in the editor; the real moves here
    // delete the old source directories so they are absent after editor.commit().
    const { default: fse } = await import('fs-extra');
    if (await pathExistsOnDisk(paths.ffLegacyWebappPath)) {
        fse.moveSync(paths.ffLegacyWebappPath, join(rootPath, DirName.Webapp), { overwrite: true });
    }
    if (await pathExistsOnDisk(paths.ffLegacyTestQunitPath)) {
        fse.moveSync(paths.ffLegacyTestQunitPath, paths.ffNewTestPath, { overwrite: true });
    }
    if (await pathExistsOnDisk(paths.ffLegacyTestuiveri5Path)) {
        fse.moveSync(paths.ffLegacyTestuiveri5Path, paths.ffNewTestPath, { overwrite: true });
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
    const fsextra = await import('fs-extra');

    const dirsToRemove = [join(rootPath, legacyPath), paths.ffLegacyTestPath, join(rootPath, 'src')];

    // Check and remove directories sequentially to avoid filesystem race conditions
    for (const dir of dirsToRemove) {
        if (await pathExistsOnDisk(dir)) {
            // NOSONAR - Sequential check for race prevention
            const dirContents = await readdir(dir); // NOSONAR - Filesystem state consistency required
            if (dirContents.filter((file) => file !== '.DS_Store').length === 0) {
                fsextra.default.removeSync(dir);
            }
        }
    }
}
