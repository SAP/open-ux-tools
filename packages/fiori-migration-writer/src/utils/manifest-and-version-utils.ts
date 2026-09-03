import { join } from 'node:path';
import type { Manifest } from '../project-spec-types.js';
import { FileName, FioriElementsVersion } from '../project-spec-types.js';
import { fileExists, readJSON } from './file-access.js';
import semver from 'semver';
import { distVar } from './constants.js';
import { stripSpaces } from './file-system-utils.js';
import type { ImportProjectInfo } from '../types.js';

/**
 * getUI5Version
 *
 * @param currentVersion
 */
export function getUI5Version(currentVersion: string | undefined): string {
    let ui5Version = '';
    if (currentVersion && stripSpaces(currentVersion).length && currentVersion.toLowerCase() !== 'latest') {
        ui5Version = stripSpaces(currentVersion);
    }
    try {
        if (ui5Version && ui5Version.length > 0 && ui5Version !== 'snapshot' && semver.lte(ui5Version, '1.38.58')) {
            ui5Version = '1.38.59';
        }
    } catch {
        // Do nothing
    }
    return ui5Version;
}

/**
 * Check if manifest version is maven variable
 *
 * @param manifestUI5Version
 */
export function checkManifestUI5Version(manifestUI5Version: string): string {
    return manifestUI5Version === distVar ? '' : manifestUI5Version;
}

/**
 * Read manifest.json from project
 *
 * @param rootPath
 * @param webappPath
 * @param uiAdaptation
 */
export async function readManifest(
    rootPath: string,
    webappPath: string,
    uiAdaptation?: any
): Promise<Manifest | undefined> {
    const manifestPath = join(rootPath, webappPath, FileName.Manifest);
    let manifestJSON: Manifest | undefined;
    if (uiAdaptation === undefined && (await fileExists(manifestPath))) {
        manifestJSON = await readJSON(manifestPath);
    }
    return manifestJSON;
}

/**
 * Determine if we are dealing with a SAP Freestyle application
 *
 * @param manifest
 * @param feVersion
 */
export function isAppFreestyle(manifest: Manifest, feVersion: FioriElementsVersion | undefined): boolean {
    return (
        typeof manifest === 'object' &&
        manifest !== null &&
        manifest?.['sap.app']?.type === 'application' &&
        !(feVersion === FioriElementsVersion.v2 || feVersion === FioriElementsVersion.v4)
    );
}

/**
 * Determine if index.html should be generated
 *
 * @param projectInfo
 * @param internalToggle
 */
export function isGenerateIndex(projectInfo: ImportProjectInfo, internalToggle: boolean): boolean {
    return ((projectInfo.FEVersion === FioriElementsVersion.v2 ||
        projectInfo.FEVersion === FioriElementsVersion.v4 ||
        projectInfo.isSAPApp) &&
        internalToggle === false) as boolean;
}
