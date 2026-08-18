import { basename, join } from 'node:path';
import type { Editor } from 'mem-fs-editor';
import type { ToolsLogger } from '@sap-ux/logger';
import { FileName, type Package } from '@sap-ux/project-access';
import { getRTAUrl, getRTAUrlParameters } from './utils.js';
import { writeCdsWatchScript } from '../common/cap-utils.js';

/**
 * Writes the `start-variants-management-<appFolderName>` script to the CAP root `package.json`.
 * Uses `cds watch --open "<appId><rtaPath>"` so the app is opened via the CDS development
 * server rather than a standalone UI5 tooling server.
 *
 * @param capRoot - path to the CAP project root
 * @param appId - sap.app.id from the app's manifest.json (used as the URL prefix)
 * @param appFolderName - basename of the app folder (used as the script name suffix)
 * @param basePath - path to the UI5 app root (where ui5.yaml and the app package.json live)
 * @param fs - mem-fs-editor instance
 * @param yamlPath - optional path to the ui5*.yaml file
 * @param logger - optional logger
 */
export async function updateCapRootPackageJsonForVariants(
    capRoot: string,
    appId: string,
    appFolderName: string,
    basePath: string,
    fs: Editor,
    yamlPath?: string,
    logger?: ToolsLogger
): Promise<void> {
    const capRootPackageJsonPath = join(capRoot, FileName.Package);
    if (!fs.exists(capRootPackageJsonPath)) {
        throw new Error(`package.json not found at CAP root: ${capRoot}`);
    }

    const appPackageJson = (fs.readJSON(join(basePath, 'package.json')) ?? {}) as Package;
    const ui5YamlFileName = yamlPath ? basename(yamlPath) : FileName.Ui5Yaml;

    const rtaUrl = await getRTAUrl(basePath, getRTAUrlParameters(appPackageJson), ui5YamlFileName, fs);
    if (!rtaUrl) {
        throw new Error(
            `Script 'start-variants-management-${appFolderName}' cannot be written to package.json. No RTA editor specified in ui5.yaml.`
        );
    }

    writeCdsWatchScript(capRoot, `start-variants-management-${appFolderName}`, `${appId}${rtaUrl}`, fs, logger);
}
