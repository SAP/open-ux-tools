/**
 * Utilities for detecting and processing reuse library projects
 */

import { basename, join } from 'node:path';
import { getReuseLibs } from '../file-discovery.js';
import { readJSON } from '../../index.js';
import type { Manifest } from '../../project-spec-types.js';
import { FileName } from '../../project-spec-types.js';
import { MigrationTypes } from '../constants.js';
import type { ProjectFolder } from '../../types.js';
import { URI } from 'vscode-uri';

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
    } catch {
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
            return lib.value.libRoot === projectRoot;
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
