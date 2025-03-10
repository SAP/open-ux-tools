import { join } from 'path';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import type { Editor } from 'mem-fs-editor';
import type { Package } from '@sap-ux/project-access';
import { addCdsPluginUi5, enableWorkspaces, ensureMinCdsVersion } from './package-json';

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
