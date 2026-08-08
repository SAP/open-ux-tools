/**
 * Helper functions for extracting and filtering SAP libraries from manifest
 */
import { join } from 'node:path';
import { fileExists, readFile } from '../utils/index.js';
import { sapUI5LibsNS } from '../utils/constants.js';

/**
 * Result of SAP libraries extraction
 */
export interface SapLibrariesExtractionResult {
    manifestLibs: Record<string, any>;
    reuseManifestLibs: Record<string, any>;
}

/**
 * Extract and filter SAP libraries from manifest into SAPUI5 libs and reuse libs
 * Handles filtering by SAP namespaces and checking for legacy sap.ca.scfld.md in Component.js
 *
 * @param manifestLibsTmp - Raw libraries object from manifest['sap.ui5'].dependencies.libs
 * @param projectRoot - Root path of the project
 * @param webappPath - Webapp path within the project
 * @returns SAP libraries extraction result
 */
export async function extractSapLibraries(
    manifestLibsTmp: Record<string, any>,
    projectRoot: string,
    webappPath: string
): Promise<SapLibrariesExtractionResult> {
    const manifestLibs: any = {};
    const reuseManifestLibs: any = {};

    // Filter libraries by SAP namespaces
    Object.keys(manifestLibsTmp).forEach(function (manifestLibKey) {
        // only libs that start with SAPUI5 delivered namespaces
        if (
            sapUI5LibsNS.some((substring) => {
                return manifestLibKey === substring || manifestLibKey.startsWith(substring + '.');
            })
        ) {
            manifestLibs[manifestLibKey] = manifestLibsTmp[manifestLibKey];
        } else if (!['sap.ca.scfld.md', 'sap.collaboration', 'sap.ca.ui'].includes(manifestLibKey)) {
            reuseManifestLibs[manifestLibKey] = manifestLibsTmp[manifestLibKey];
        }
    });

    // Check for sap.ca.scfld.md in component.js in older projects
    try {
        const componentJSPath = join(projectRoot, webappPath, 'Component.js');
        if (await fileExists(componentJSPath)) {
            // sap.ca.scfld.md
            const componentJsContent = await readFile(componentJSPath);
            if (componentJsContent.indexOf('sap.ca.scfld.md') > 0) {
                manifestLibs['sap.ca.scfld.md'] = {};
                manifestLibs['sap.collaboration'] = {};
            }
        }
    } catch {
        // Expected: Component.js may not exist (newer projects use Component.ts or have no Component file).
        // Safe to skip - this is legacy SAP library detection for very old projects only.
    }

    return {
        manifestLibs,
        reuseManifestLibs
    };
}
