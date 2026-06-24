import { basename } from 'node:path';
import { join } from 'node:path';
import type { Editor } from 'mem-fs-editor';
import { findCapProjectRoot, getProjectType, FileName, type Package } from '@sap-ux/project-access';
import type { ProjectType } from '@sap-ux/project-access';
import { readManifest } from './utils.js';

export type EdmxProjectInfo = {
    projectType: 'EDMXBackend';
    capRoot: null;
    appFolderName: string;
};

export type CapProjectInfo = {
    projectType: Exclude<ProjectType, 'EDMXBackend'>;
    capRoot: string;
    appFolderName: string;
    appId: string;
};

export type ProjectInfo = EdmxProjectInfo | CapProjectInfo;

/**
 * Resolves project info for a given app base path.
 * For EDMX projects, capRoot is null and appId is not present.
 * For CAP projects, capRoot is the CAP root path and appId is sap.app.id from manifest.json.
 *
 * @param basePath - path to the UI5 app root
 * @param fs - mem-fs-editor instance
 * @returns ProjectInfo discriminated by projectType
 */
export async function getCapProjectInfo(basePath: string, fs: Editor): Promise<ProjectInfo> {
    const capRoot = await findCapProjectRoot(basePath, false, fs);
    const projectType = await getProjectType(capRoot ?? basePath);
    const appFolderName = basename(basePath);

    if (projectType === 'EDMXBackend') {
        return { projectType, capRoot: null, appFolderName };
    }

    const { manifest } = await readManifest(basePath, fs);
    const appId = manifest['sap.app']?.id;

    if (!appId) {
        throw new Error(`The 'sap.app.id' property is missing in the manifest.json file.`);
    }

    return { projectType, capRoot: capRoot as string, appFolderName, appId };
}

/**
 * Writes a `cds watch` script to the CAP root `package.json`.
 *
 * @param capRoot - path to the CAP project root
 * @param scriptKey - key of the script to write (e.g. 'start-cards-generator-my_app')
 * @param openPath - the path to open, relative to the CDS server root (e.g. 'ns.myapp/test/...')
 * @param fs - mem-fs-editor instance
 * @param logger - optional logger
 */
export function writeCdsWatchScript(
    capRoot: string,
    scriptKey: string,
    openPath: string,
    fs: Editor,
    logger?: { debug: (msg: string) => void }
): void {
    const packageJsonPath = join(capRoot, 'package.json');
    if (!fs.exists(packageJsonPath)) {
        throw new Error(`package.json not found at CAP root: ${capRoot}`);
    }

    const packageJson = (fs.readJSON(packageJsonPath) ?? {}) as Package;
    packageJson.scripts ??= {};
    packageJson.scripts[scriptKey] = `cds watch --open "${openPath}"`;

    fs.writeJSON(packageJsonPath, packageJson);
    logger?.debug(`Script '${scriptKey}' written to CAP root package.json.`);
}
