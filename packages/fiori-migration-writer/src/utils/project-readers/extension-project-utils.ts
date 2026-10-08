/**
 * Utilities for detecting and processing extension projects
 * Handles both legacy WebIDE and new format extension projects
 */

import { basename, join } from 'node:path';
import { fileExists, readJSON } from '../../index.js';
import { getCurrentEditor } from '../fs-adapter.js';
import type { Manifest } from '../../project-spec-types.js';
import { sapWattCommonSetting } from '../../types.js';

// Debug flag - enabled in CI or via env var
const DEBUG_EXTENSION_DETECTION = process.env.DEBUG_EXTENSION_DETECTION === 'true' || process.env.CI === 'true';

/**
 * Read project extension settings from configuration files
 * Checks both .che/project.json (WebIDE) and .project.json (legacy) formats
 *
 * @param projectRoot - Root path of the project
 * @returns Extension settings or undefined
 */
export async function readProjectExtensionSettings(projectRoot: string): Promise<unknown> {
    if (DEBUG_EXTENSION_DETECTION) {
        console.log(`[EXT-DETECT] readProjectExtensionSettings called for: ${projectRoot}`);
        console.log(`[EXT-DETECT] getCurrentEditor(): ${getCurrentEditor() ? 'AVAILABLE' : 'UNDEFINED'}`);
    }
    try {
        // Try .che/project.json first
        const cheSettings = await readCheProjectExtensionSettings(projectRoot);
        if (DEBUG_EXTENSION_DETECTION) {
            console.log(`[EXT-DETECT] cheSettings result: ${cheSettings ? 'FOUND' : 'NOT FOUND'}`);
        }
        if (cheSettings) {
            return cheSettings;
        }

        // Fallback to .project.json
        const legacySettings = await readLegacyProjectExtensionSettings(projectRoot);
        if (DEBUG_EXTENSION_DETECTION) {
            console.log(`[EXT-DETECT] legacySettings result: ${legacySettings ? 'FOUND' : 'NOT FOUND'}`);
        }
        if (legacySettings) {
            return legacySettings;
        }
    } catch (error: unknown) {
        if (DEBUG_EXTENSION_DETECTION) {
            console.log(`[EXT-DETECT] Error in readProjectExtensionSettings: ${error}`);
        }
        // Ignore errors
    }

    return undefined;
}

/**
 * Read extension settings from .che/project.json
 *
 * @param projectRoot - Root path of the project
 * @returns Extension settings or undefined
 */
async function readCheProjectExtensionSettings(projectRoot: string): Promise<unknown> {
    const projectJsonPath = join(projectRoot, '.che', 'project.json');
    if (DEBUG_EXTENSION_DETECTION) {
        console.log(`[EXT-DETECT] Checking .che/project.json at: ${projectJsonPath}`);
        console.log(
            `[EXT-DETECT] getCurrentEditor() before fileExists: ${getCurrentEditor() ? 'AVAILABLE' : 'UNDEFINED'}`
        );
    }
    const exists = await fileExists(projectJsonPath);
    if (DEBUG_EXTENSION_DETECTION) {
        console.log(`[EXT-DETECT] fileExists result: ${exists}`);
        console.log(
            `[EXT-DETECT] getCurrentEditor() after fileExists: ${getCurrentEditor() ? 'AVAILABLE' : 'UNDEFINED'}`
        );
    }
    if (!exists) {
        return undefined;
    }

    try {
        if (DEBUG_EXTENSION_DETECTION) {
            console.log(
                `[EXT-DETECT] getCurrentEditor() before readJSON: ${getCurrentEditor() ? 'AVAILABLE' : 'UNDEFINED'}`
            );
        }
        const projectJson: any = await readJSON(projectJsonPath);
        if (DEBUG_EXTENSION_DETECTION) {
            console.log(`[EXT-DETECT] readJSON succeeded, has attributes: ${!!projectJson?.attributes}`);
            console.log(`[EXT-DETECT] has sapWattCommonSetting: ${!!projectJson?.attributes?.[sapWattCommonSetting]}`);
        }
        if (projectJson?.attributes?.[sapWattCommonSetting]?.[0]) {
            const settings = JSON.parse(projectJson.attributes[sapWattCommonSetting][0]);
            if (DEBUG_EXTENSION_DETECTION) {
                console.log(`[EXT-DETECT] Parsed settings, has extensibility: ${!!settings?.extensibility}`);
            }
            return settings?.extensibility;
        }
    } catch (error: unknown) {
        if (DEBUG_EXTENSION_DETECTION) {
            console.log(`[EXT-DETECT] Error reading .che/project.json: ${error}`);
        }
        // Invalid JSON or missing extensibility
    }

    return undefined;
}

/**
 * Read extension settings from .project.json (legacy format)
 *
 * @param projectRoot - Root path of the project
 * @returns Extension settings or undefined
 */
async function readLegacyProjectExtensionSettings(projectRoot: string): Promise<unknown> {
    const projectJsonPath = join(projectRoot, '.project.json');
    if (!(await fileExists(projectJsonPath))) {
        return undefined;
    }

    try {
        const projectJson: any = await readJSON(projectJsonPath);
        return projectJson?.extensibility;
    } catch (error: unknown) {
        // Invalid JSON
    }

    return undefined;
}

/**
 * Check if project is an extension project
 *
 * @param projectRoot - Root path of the project
 * @returns True if extension settings found
 */
export async function checkIfProjectExtension(projectRoot: string): Promise<boolean> {
    const extensionProject = await readProjectExtensionSettings(projectRoot);
    return !!extensionProject;
}

/**
 * Get module name for extension project
 *
 * @param projectRoot - Root path of the project
 * @param projectSettings - Extension project settings
 * @param manifest - Optional manifest object
 * @returns Module name
 */
export function getExtensionProjectModuleName(projectRoot: string, projectSettings: any, manifest?: Manifest): string {
    let moduleName;
    if (manifest?.['sap.app']?.id) {
        moduleName = manifest['sap.app'].id;
    } else if (projectSettings?.namespace) {
        moduleName = `${projectSettings.namespace}.${
            // remove / from ABAP namespace in BSPName
            projectSettings?.BSPName
                ? `${projectSettings?.BSPName.replaceAll('/', '')}Extension`
                : basename(projectRoot).replaceAll(' ', '')
        }`;
    }
    // fallback to set a default name if one can not be determined
    if (!moduleName) {
        moduleName = basename(projectRoot);
    }
    return moduleName;
}
