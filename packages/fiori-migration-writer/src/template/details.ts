/**
 * Helper functions for extracting template details from manifest and pom.xml
 */
import { join } from 'node:path';
import { TemplateFileName } from '../index.js';
import { fileExists, readFile } from '../utils/index.js';
import type { Manifest, ManifestNamespace, FioriElementsVersion } from '../project-spec-types.js';
import { xmlToJson } from '../utils/service.js';
import { isAppFreestyle } from '../utils/common.js';

/**
 * Result of template details extraction
 */
export interface TemplateDetailsExtractionResult {
    feVersion: FioriElementsVersion | undefined;
    isSAPApp: boolean;
    floorPlan: string | undefined;
    mainServiceDatasource: Partial<ManifestNamespace.DataSource>;
    sapAppId: string;
    appVersion: string;
}

/**
 * Extract template details including FE version, floor plan, and app metadata from manifest and pom.xml
 *
 * @param manifest - The manifest object
 * @param projectRoot - Root path of the project
 * @param mainService - Main service name
 * @param existingAppVersion - Existing app version (if any)
 * @param getVersionFromManifest - Function to get FE version from manifest
 * @param getFloorPlan - Function to get floor plan from manifest
 * @returns Template details extraction result
 */
export async function extractTemplateDetails(
    manifest: Manifest,
    projectRoot: string,
    mainService: string,
    existingAppVersion: string,
    getVersionFromManifest: (manifest: Manifest) => FioriElementsVersion | undefined,
    getFloorPlan: (manifest: Manifest, feVersion: FioriElementsVersion | undefined) => string
): Promise<TemplateDetailsExtractionResult> {
    const feVersion = getVersionFromManifest(manifest);
    const isSAPApp = !feVersion ? isAppFreestyle(manifest, feVersion) : false;
    const floorPlan = !isSAPApp ? getFloorPlan(manifest, feVersion) : undefined;

    const mainServiceDatasource = extractMainServiceDatasource(manifest, mainService);
    const { sapAppId, appVersion } = await extractPomDetails(manifest, projectRoot, existingAppVersion);

    return {
        feVersion,
        isSAPApp,
        floorPlan,
        mainServiceDatasource,
        sapAppId,
        appVersion
    };
}

/**
 * Extract main service datasource from manifest
 *
 * @param manifest
 * @param mainService
 */
function extractMainServiceDatasource(manifest: Manifest, mainService: string): Partial<ManifestNamespace.DataSource> {
    try {
        return manifest['sap.app']?.dataSources?.[mainService] || {};
    } catch (error: unknown) {
        // Expected: manifest structure may be malformed in legacy projects, causing property access to throw.
        // Safe to return empty object - service configuration will be derived from other sources.
        return {};
    }
}

/**
 * Extract app ID and version from pom.xml
 *
 * @param manifest
 * @param projectRoot
 * @param existingAppVersion
 */
async function extractPomDetails(
    manifest: Manifest,
    projectRoot: string,
    existingAppVersion: string
): Promise<{ sapAppId: string; appVersion: string }> {
    let sapAppId = manifest['sap.app']?.id || '';
    let appVersion = existingAppVersion;

    const pomXmlPath = join(projectRoot, TemplateFileName.Pom);
    if (!(await fileExists(pomXmlPath))) {
        return { sapAppId, appVersion };
    }

    try {
        const pomFileStr = readFile(pomXmlPath);
        const pomJSON: any = xmlToJson(pomFileStr);

        if (!pomJSON) {
            return { sapAppId, appVersion };
        }

        // Extract version
        if (appVersion === '' && pomJSON?.project?.version) {
            appVersion = pomJSON.project.version.toString();
        }

        // Extract app ID if it's a placeholder
        if (manifest['sap.app']?.id?.includes('${')) {
            sapAppId = resolveAppIdFromPom(manifest['sap.app'].id, pomJSON);
        }
    } catch (error: unknown) {
        // Expected: pom.xml may be malformed or contain invalid XML in legacy WebIDE projects.
        // Safe to return defaults - app version and ID will be derived from manifest.json instead.
    }

    return { sapAppId, appVersion };
}

/**
 * Resolve app ID placeholder from pom.xml using property path
 *
 * @param manifestAppId
 * @param pomJSON
 */
function resolveAppIdFromPom(manifestAppId: string, pomJSON: any): string {
    const sapAppIdKey = manifestAppId.replace(/\$\{|\}/g, '').trim();

    try {
        // Use safe property access instead of eval
        const result = sapAppIdKey.split('.').reduce((obj: any, key) => obj?.[key], pomJSON);
        return typeof result === 'string' ? result : manifestAppId;
    } catch (_error: unknown) {
        // Expected: property path resolution may fail if pom.xml structure doesn't match expected format.
        // Safe to return original manifest app ID - it will be used as-is or resolved later.
        return manifestAppId;
    }
}
