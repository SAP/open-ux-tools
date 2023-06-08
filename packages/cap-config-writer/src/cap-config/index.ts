import { join } from 'path';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import type { Editor } from 'mem-fs-editor';
import type { Package } from '@sap-ux/project-access';
import {
    addCdsPluginUi5,
    enableWorkspaces,
    ensureMinCdsVersion,
    getWorkspaceInfo,
    hasCdsPluginUi5,
    hasMinCdsVersion
} from './package-json';

/**
 * Enable workspace and cds-plugin-ui5 for given CAP project.
 *
 * @param basePath - root path of the CAP project, where package.json is located
 * @param [fs] - optional: the memfs editor instance
 * @returns Promise<Editor> - memfs editor instance with updated files
 */
export async function enableCdsUi5Plugin(basePath: string, fs?: Editor): Promise<Editor> {
    if (!fs) {
        fs = create(createStorage());
    }
    const packageJsonPath = join(basePath, 'package.json');
    const packageJson = (fs.readJSON(packageJsonPath) ?? {}) as Package;

    ensureMinCdsVersion(packageJson);
    await enableWorkspaces(basePath, packageJson);
    addCdsPluginUi5(packageJson);

    fs.writeJSON(packageJsonPath, packageJson);
    return fs;
}

/**
 * Check if cds-plugin-ui5 is enabled on a CAP project. Checks also all prerequisites, like minimum @sap/cds version.
 *
 * @param basePath - root path of the CAP project, where package.json is located
 * @param [fs] - optional: the memfs editor instance
 * @returns true: cds-plugin-ui5 and all prerequisites are fulfilled; false: cds-plugin-ui5 is not enabled or not all prerequisites are fulfilled
 */
export async function checkCdsUi5PluginEnabled(basePath: string, fs?: Editor): Promise<boolean> {
    if (!fs) {
        fs = create(createStorage());
    }
    const packageJsonPath = join(basePath, 'package.json');
    if (!fs.exists(packageJsonPath)) {
        return false;
    }
    const packageJson = fs.readJSON(packageJsonPath) as Package;
    const { workspaceEnabled } = await getWorkspaceInfo(basePath, packageJson);
    return hasMinCdsVersion(packageJson) && workspaceEnabled && hasCdsPluginUi5(packageJson);
}
