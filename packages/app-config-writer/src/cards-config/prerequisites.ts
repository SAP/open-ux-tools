import type { Editor } from 'mem-fs-editor';
import type { ToolsLogger } from '@sap-ux/logger';
import { findRootsForPath, getMinimumUI5Version, getProjectType } from '@sap-ux/project-access';
import { gte } from 'semver';
import { readManifest } from '../common/utils.js';
import { t, CARDS_CONFIG_NS } from '../i18n.js';

const MIN_UI5_VERSION_EDMX = '1.136.0';
const MIN_UI5_VERSION_CAP = '1.149.0';

/**
 * Check if the minimum UI5 version requirement for card generator is met.
 * - For EDMX projects: UI5 version 1.136.0 or higher is required.
 * - For CAP projects: UI5 version 1.149.0 or higher is required.
 *
 * @param basePath - base path to be used for the check
 * @param fs - file system reference
 * @param logger - logger to report errors to the user
 * @returns true if the minimum UI5 version requirement is met, false otherwise
 */
export async function checkMinUI5Version(basePath: string, fs: Editor, logger?: ToolsLogger): Promise<boolean> {
    const { manifest } = await readManifest(basePath, fs);
    const minUI5Version = getMinimumUI5Version(manifest);
    const projectRoot = (await findRootsForPath(basePath, { memFs: fs }))?.projectRoot ?? basePath;
    const isEdmx = (await getProjectType(projectRoot)) === 'EDMXBackend';
    const featureVersion = isEdmx ? MIN_UI5_VERSION_EDMX : MIN_UI5_VERSION_CAP;

    // No or invalid sap.ui5.minUi5Version property value will lead to the check being passed
    if (minUI5Version && !gte(minUI5Version, featureVersion)) {
        logger?.error(
            t('error.minUI5VersionNotMet', {
                featureVersion,
                minUI5Version,
                ns: CARDS_CONFIG_NS
            })
        );
        return false;
    }
    return true;
}
