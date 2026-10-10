/**
 * Utilities for detecting and processing reuse library projects
 */

import { basename, join, relative } from 'node:path';
import { getReuseLibs, ReuseLibType } from '../file-discovery.js';
import { readJSON } from '../../index.js';
import type { Manifest } from '../../project-spec-types.js';
import { FileName } from '../../project-spec-types.js';
import { MigrationTypes } from '../constants.js';
import type { ProjectFolder } from '../../types.js';
import { URI } from 'vscode-uri';

/**
 * Compare two absolute paths for equality, tolerating OS-level differences.
 *
 * `getReuseLibs` derives its paths from `URI.file(projectRoot).fsPath`, which
 * lowercases the Windows drive letter (e.g. `C:\p` becomes `c:\p`). A plain
 * `===` against the caller's `projectRoot` therefore fails on Windows even when
 * both reference the same directory. Using `path.relative` collapses separator
 * and casing differences: identical locations resolve to an empty relative path.
 *
 * @param pathA - First absolute path
 * @param pathB - Second absolute path
 * @returns True if both paths point to the same location
 */
export function isSamePath(pathA: string, pathB: string): boolean {
    return relative(pathA, pathB) === '';
}

/**
 * Find a reuse library manifest nested within a project's source tree.
 *
 * UI5 reuse libraries place manifest.json inside the namespace path (e.g.
 * src/sap/company/lib/name/manifest.json) with no manifest at the project root,
 * so the standard root/legacy webapp lookups miss it. This scans the project the
 * same way the workspace discovery path does and returns the library whose root
 * resolves back to projectRoot.
 *
 * @param projectRoot - Root path of the project
 * @returns The nested manifest and its path, or undefined if none is found
 */
export async function findNestedReuseLibManifest(
    projectRoot: string
): Promise<{ manifest: Manifest; manifestPath: string } | undefined> {
    const libs = await getReuseLibs([{ uri: URI.file(projectRoot), name: projectRoot, index: 0 }]);
    const matchedLib = libs.find(
        (lib) => lib.value.type === ReuseLibType.LIBRARY && isSamePath(lib.value.libRoot, projectRoot)
    );
    if (!matchedLib) {
        return undefined;
    }
    try {
        const manifest: Manifest = await readJSON(matchedLib.value.path);
        return { manifest, manifestPath: matchedLib.value.path };
    } catch (error: unknown) {
        // Manifest became unreadable between discovery and read - treat as not found
        return undefined;
    }
}

/**
 * Check if project is a reuse library
 *
 * @param projectRoot - Root path of the project
 * @param type - Optional migration type
 * @param manifest - Optional manifest object
 * @returns True if project is a reuse library
 */
export async function checkIfReuseLib(
    projectRoot: string,
    type?: MigrationTypes,
    manifest?: Manifest
): Promise<boolean> {
    if (type) {
        return type === MigrationTypes.library;
    }

    if (manifest) {
        return manifest['sap.app']?.type === 'library';
    }

    try {
        const reuseManifest: Manifest = await readJSON(join(projectRoot, FileName.Manifest));
        return reuseManifest['sap.app']?.type === 'library';
    } catch (error: unknown) {
        // manifest not found
        return false;
    }
}

/**
 * Get module name for reuse library
 *
 * @param projectRoot - Root path of the project
 * @param workspaceFolders - Optional workspace folders
 * @param manifest - Optional manifest object
 * @returns Module name
 */
export async function getReuseLibModuleName(
    projectRoot: string,
    workspaceFolders?: readonly ProjectFolder[],
    manifest?: Manifest
): Promise<string> {
    let moduleName;
    if (manifest) {
        moduleName = manifest['sap.app']?.id;
    } else if (workspaceFolders) {
        // Convert ProjectFolder[] to WorkspaceFolder[] with complete Uri objects
        const workspaceFoldersWithUri = workspaceFolders.map((folder) => ({
            uri: URI.file(folder.uri.fsPath),
            name: folder.name,
            index: folder.index
        }));
        const libs = await getReuseLibs(workspaceFoldersWithUri);
        const matchedLib = libs.find((lib) => {
            return isSamePath(lib.value.libRoot, projectRoot);
        });
        if (matchedLib?.value?.name) {
            moduleName = matchedLib.value.name;
        }
    }
    // fallback to set a default name if one can not be determined
    if (!moduleName) {
        moduleName = basename(projectRoot);
    }
    return moduleName;
}
