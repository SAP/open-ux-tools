/**
 * Utilities for detecting and processing adaptation projects
 * Handles both legacy WebIDE and Fiori Tools adaptation projects
 */

import { join } from 'node:path';
import { fileExists, readJSON } from '../../index.js';
import { sapWattCommonSetting } from '../../types.js';

/**
 * Check if project is a migratable adaptation project
 * Checks both legacy WebIDE (.che/project.json) and Fiori Tools (.adp/config.json) formats
 *
 * @param projectRoot - Root path of the project
 * @returns Adaptation project configuration or undefined
 */
export async function checkMigratableAdaptationProject(projectRoot: string): Promise<any> {
    let adaptationProject: any;

    // Check for legacy WebIDE adaptation project settings
    adaptationProject = await checkCheProjectSettings(projectRoot);

    // Check for Fiori Tools adaptation project
    const adpConfig = await checkFioriToolsAdaptation(projectRoot);
    if (adpConfig) {
        adaptationProject = adpConfig;
    }

    // Read manifest.appdescr_variant reference if available
    if (adaptationProject) {
        const ref = await readManifestReference(projectRoot);
        if (ref !== undefined) {
            adaptationProject.reference = ref;
        }
    }

    return adaptationProject;
}

/**
 * Check for legacy WebIDE adaptation project settings in .che/project.json
 *
 * @param projectRoot - Root path of the project
 * @returns Adaptation project settings or undefined
 */
async function checkCheProjectSettings(projectRoot: string): Promise<any> {
    try {
        const cheProjectJsonPath = join(projectRoot, '.che', 'project.json');
        if (await fileExists(cheProjectJsonPath)) {
            const projectJson = await readJSON(cheProjectJsonPath);
            if (projectJson?.attributes?.[sapWattCommonSetting]) {
                try {
                    const settings: any = JSON.parse(projectJson.attributes[sapWattCommonSetting]?.[0]);
                    if (settings?.uiadaptation) {
                        return settings.uiadaptation;
                    }
                } catch {
                    // Invalid JSON in settings
                }
            }
        }
    } catch {
        // No .che/project.json
    }
    return undefined;
}

/**
 * Check for Fiori Tools adaptation project (.adp/config.json)
 *
 * @param projectRoot - Root path of the project
 * @returns Adaptation project config with isAdp flag or undefined
 */
async function checkFioriToolsAdaptation(projectRoot: string): Promise<any> {
    try {
        if (await isFioriToolsAdaptationProject(projectRoot)) {
            const config = await readJSON(join(projectRoot, '.adp', 'config.json'));
            if (config) {
                config.isAdp = true;
                return config;
            }
        }
    } catch {
        // No .adp/config.json
    }
    return undefined;
}

/**
 * Read reference from manifest.appdescr_variant
 *
 * @param projectRoot - Root path of the project
 * @returns Reference string or undefined
 */
async function readManifestReference(projectRoot: string): Promise<string | undefined> {
    try {
        const manifestAppdescrPath = join(projectRoot, 'webapp', 'manifest.appdescr_variant');
        if (await fileExists(manifestAppdescrPath)) {
            const manifestAppdescr = await readJSON(manifestAppdescrPath);
            return manifestAppdescr?.reference ?? '';
        }
    } catch {
        // No manifest.appdescr_variant
    }
    return undefined;
}

/**
 * Check if project is a Fiori Tools adaptation project
 *
 * @param projectRoot - Root path of the project
 * @returns True if .adp/config.json exists
 */
export async function isFioriToolsAdaptationProject(projectRoot: string): Promise<boolean> {
    const adpConfigJsonPath = join(projectRoot, '.adp', 'config.json');
    return fileExists(adpConfigJsonPath);
}
