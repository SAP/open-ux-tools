import type { Editor } from 'mem-fs-editor';
import {
    getMinimumUI5Version,
    getProjectType,
    findProjectRoot,
    checkCdsUi5PluginEnabled
} from '@sap-ux/project-access';
import { gte } from 'semver';
import { readManifest } from '../common/utils.js';

const MIN_UI5_VERSION_EDMX = '1.121.0';
const MIN_UI5_VERSION_CAP = '1.149.0';

/**
 * Ensures the minimum UI5 version requirement for card generator is met.
 * - For EDMX projects: UI5 version 1.121.0 or higher is required.
 * - For CAP projects: UI5 version 1.149.0 or higher is required.
 *
 * @param basePath - base path to be used for the check
 * @param fs - file system reference
 * @throws {Error} if the minimum UI5 version requirement is not met
 */
export async function ensureMinUI5Version(basePath: string, fs: Editor): Promise<void> {
    const { manifest } = await readManifest(basePath, fs);
    const minUI5Version = getMinimumUI5Version(manifest);
    const projectRoot = await findProjectRoot(basePath, true, true, fs);
    const isEdmx = (await getProjectType(projectRoot)) === 'EDMXBackend';
    const featureVersion = isEdmx ? MIN_UI5_VERSION_EDMX : MIN_UI5_VERSION_CAP;

    // No or invalid sap.ui5.minUi5Version property value will lead to the check being passed
    if (minUI5Version && !gte(minUI5Version, featureVersion)) {
        throw new Error(
            `The card generator is only supported for projects with a minimum SAPUI5 version of ${featureVersion} or higher. The detected minimum SAPUI5 version is ${minUI5Version}. Update the sap.ui5.minUI5Version property in the manifest.json file and ensure the SAPUI5 version used is ${featureVersion} or higher.`
        );
    }
}

/**
 * Ensures that `cds-plugin-ui5` is installed and enabled in the CAP root for CAP Node.js projects.
 * The card generator relies on the CDS development server to serve the UI5 app, which requires this plugin.
 *
 * @param capRoot - path to the CAP project root
 * @param fs - file system reference
 * @throws {Error} if `cds-plugin-ui5` is not enabled in the CAP root
 */
export async function ensureCdsPluginUi5(capRoot: string, fs: Editor): Promise<void> {
    if (!(await checkCdsUi5PluginEnabled(capRoot, fs))) {
        throw new Error(
            `The cards-editor command requires 'cds-plugin-ui5' to be installed and enabled in the CAP root package.json.`
        );
    }
}
