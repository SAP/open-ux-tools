/**
 * Utilities for detecting and processing extension projects
 * Handles both legacy WebIDE and new format extension projects
 */

import { basename, join } from 'node:path';
import { fileExists, readJSON } from '../../index.js';
import type { Manifest } from '../../project-spec-types.js';
import { sapWattCommonSetting } from '../../types.js';

/**
 * Read project extension settings from configuration files
 * Checks both .che/project.json (WebIDE) and .project.json (legacy) formats
 *
 * @param projectRoot - Root path of the project
 * @returns Extension settings or undefined
 */
export async function readProjectExtensionSettings(projectRoot: string): Promise<unknown> {
    try {
        // Try .che/project.json first
        const cheSettings = await readCheProjectExtensionSettings(projectRoot);
        if (cheSettings) {
            return cheSettings;
        }

        // Fallback to .project.json
        const legacySettings = await readLegacyProjectExtensionSettings(projectRoot);
        if (legacySettings) {
            return legacySettings;
        }
    } catch {
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
    if (!(await fileExists(projectJsonPath))) {
        return undefined;
    }

    try {
        const projectJson: any = await readJSON(projectJsonPath);
        if (projectJson?.attributes?.[sapWattCommonSetting]?.[0]) {
            const settings = JSON.parse(projectJson.attributes[sapWattCommonSetting][0]);
            return settings?.extensibility;
        }
    } catch {
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
    } catch {
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
                ? `${projectSettings?.BSPName.replace(/\//g, '')}Extension`
                : basename(projectRoot).replaceAll(' ', '')
        }`;
    }
    // fallback to set a default name if one can not be determined
    if (!moduleName) {
        moduleName = basename(projectRoot);
    }
    return moduleName;
}
