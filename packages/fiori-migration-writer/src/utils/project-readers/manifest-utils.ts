/**
 * Utilities for manifest.json parsing and analysis
 * Handles FE version detection, floor plan determination, and semantic objects
 */

import { join } from 'node:path';
import { parse } from 'yaml';
import type { Editor } from 'mem-fs-editor';
import { fileExists } from '../../index.js';
import { readFile } from '../../utils/file-access.js';
import type { Manifest, SapUi5RoutingTarget } from '../../project-spec-types.js';
import { FioriElementsVersion } from '../../project-spec-types.js';
import { FLOOR_PLAN } from '../../types.js';
import { i18nText } from '../../i18n.js';

/**
 * Get Fiori Elements version from manifest
 *
 * @param manifest - Manifest object
 * @returns FE version or undefined for freestyle apps
 */
export function getVersionFromManifest(manifest: Manifest): FioriElementsVersion | undefined {
    const manifestGenericApp = manifest['sap.ui.generic.app'];
    if (manifest?.['sap.app']?.type === 'application') {
        if (manifestGenericApp) {
            return FioriElementsVersion.v2;
        } else if (manifest['sap.ovp']) {
            return FioriElementsVersion.v2;
        } else if (manifest['sap.ui5']?.routing?.targets) {
            let hasV4pPages = false;
            const targets = manifest['sap.ui5']?.routing?.targets || {};
            Object.keys(targets).forEach((target) => {
                const routingTargetName = targets[target] as SapUi5RoutingTarget;
                if (
                    routingTargetName?.name?.startsWith('sap.fe.templates.') ||
                    routingTargetName?.name?.startsWith('sap.fe.core.fpm')
                ) {
                    hasV4pPages = true;
                }
            });
            return hasV4pPages ? FioriElementsVersion.v4 : undefined;
        } else {
            return undefined;
        }
    } else {
        return undefined;
    }
}

/**
 * Get semantic object-action from manifest crossNavigation inbounds
 *
 * @param manifest - Manifest object
 * @returns Semantic object-action string or undefined
 */
export function getSemanticObjectAction(manifest: Manifest): string | undefined {
    let result;

    if (manifest?.['sap.app']?.crossNavigation?.inbounds) {
        const inbounds = manifest['sap.app'].crossNavigation.inbounds;
        const firstInboundKey = Object.keys(inbounds)[0];

        if (firstInboundKey && inbounds[firstInboundKey]) {
            const firstInbound = inbounds[firstInboundKey];
            result = `${firstInbound?.semanticObject}-${firstInbound?.action}`;
        }
    }
    return result;
}

/**
 * Process a single line to add quotes to property names for JSON parsing
 *
 * @param line - Line of configuration text
 * @returns Processed line with quoted property names
 */
function processConfigLine(line: string): string {
    const colonPos = line.indexOf(':');
    if (colonPos === -1) {
        return line;
    }

    const beforeColon = line.substring(0, colonPos).trim();
    const propName = beforeColon.replace(/(?:^['"])|(?:['"]$)/g, '');

    // Only process valid property names (word characters)
    if (!/^\w+$/.test(propName)) {
        return line;
    }

    // Reconstruct line with proper JSON quotes
    const afterColon = line.substring(colonPos);
    const indentMatch = /^\s*/.exec(line);
    const indent = indentMatch?.[0] || '';
    return `${indent}"${propName}"${afterColon}`;
}

/**
 * Extract and parse FLP sandbox configuration from HTML content
 *
 * @param htmlContent - HTML file content
 * @returns First application intent key or undefined
 */
function extractFlpIntentFromConfig(htmlContent: string): string | undefined {
    const key = 'window["sap-ushell-config"] = {';
    const keyPos = htmlContent.indexOf(key);
    if (keyPos === -1) {
        return undefined;
    }

    const startPos = keyPos + key.length;
    const endPos = htmlContent.indexOf('};', startPos);
    const configStr = htmlContent.substring(startPos - 1, endPos + 1);

    // Process lines to add quotes to property names (ReDoS-safe approach)
    const lines = configStr.split('\n');
    const processedLines = lines.map(processConfigLine);
    const cleanedConfig = processedLines.join('\n').replace('-"', '-');

    // Parse JSON and extract first application intent
    try {
        const config: { applications?: Record<string, unknown> } = JSON.parse(cleanedConfig);
        const applications = config?.applications;
        if (applications && Object.keys(applications).length > 0) {
            return Object.keys(applications)[0];
        }
    } catch (error: unknown) {
        // Expected: FLP sandbox config may contain JavaScript-style JSON (unquoted keys, trailing commas)
        // that cannot be parsed after our quote-adding heuristics. Safe to return undefined - FLP intent
        // will be determined from other sources (manifest.json crossNavigation or defaults).
    }

    return undefined;
}

/**
 * Extract FLP intent from HTML file (flpSandbox.html or similar)
 *
 * @param fs - mem-fs editor
 * @param htmlFilePath - Path to HTML file
 * @returns FLP intent string or undefined
 */
export function getFlpIntentFromHtml(fs: Editor, htmlFilePath: string): string | undefined {
    try {
        if (!fileExists(fs, htmlFilePath)) {
            return undefined;
        }

        const htmlContent = readFile(fs, htmlFilePath);
        return extractFlpIntentFromConfig(htmlContent);
    } catch {
        // Expected: HTML file may be malformed, contain encoding issues, or have unexpected structure.
        // Safe to return undefined - FLP intent will be derived from manifest.json or use defaults.
        return undefined;
    }
}

/**
 * Error thrown when project type is not supported for migration
 */
export class UnsupportedProjectError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'UnsupportedProjectError';
    }
}

/**
 * Determine floor plan from manifest and FE version
 *
 * @param manifest - Manifest object
 * @param feVersion - Fiori Elements version
 * @returns Floor plan identifier
 * @throws {UnsupportedProjectError} When project type is not suitable for migration
 */
export function getFloorPlan(manifest: Manifest, feVersion: FioriElementsVersion | undefined): string {
    let floorPlan: string | undefined;

    if (feVersion && feVersion === FioriElementsVersion.v2) {
        if (manifest?.['sap.ui.generic.app']?.pages) {
            floorPlan = FLOOR_PLAN.ListReportObjectPageV2; // default

            // check if ALP

            Object.keys(manifest?.['sap.ui.generic.app']?.pages)?.forEach((page) => {
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                const component = manifest['sap.ui.generic.app']?.pages?.[page]?.component;

                if (component?.name === 'sap.suite.ui.generic.template.AnalyticalListPage') {
                    floorPlan = FLOOR_PLAN.AnalyticalListPageV2;
                } else if (
                    component?.name === 'sap.suite.ui.generic.template.ListReport' &&
                    component?.settings?.isWorklist === true
                ) {
                    floorPlan = FLOOR_PLAN.WorklistV2;
                }
            });
        } else if (manifest['sap.ovp']) {
            floorPlan = FLOOR_PLAN.OverviewPageV2;
        }
    }
    if (floorPlan) {
        return floorPlan;
    } else if (feVersion === FioriElementsVersion.v4) {
        // Don't throw message here it will be handled later in migration : 'Migration of OData V4 Projects is not currently supported';
        return FLOOR_PLAN.ListReportObjectPageV4;
    } else {
        throw new UnsupportedProjectError(i18nText('ERROR_NOT_SUITABLE_FOR_MIGRATION'));
    }
}

/**
 * Get main entity from manifest
 *
 * @param manifest - Manifest object
 * @returns Main entity name
 */
export function getMainEntity(manifest: Manifest): string {
    let mainEntity = '';
    const manifestGenericApp = manifest['sap.ui.generic.app'];
    if (manifestGenericApp?.pages) {
        Object.keys(manifestGenericApp.pages).forEach((page, index) => {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            if (index === 0 && manifestGenericApp.pages[page].entitySet) {
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                mainEntity = manifestGenericApp.pages[page].entitySet;
            }
        });
    } else if (
        manifest['sap.ovp'] &&
        (manifest['sap.ovp'].globalFilterEntityType || manifest['sap.ovp'].globalFilterEntitySet)
    ) {
        mainEntity = manifest['sap.ovp']?.globalFilterEntityType ?? manifest['sap.ovp']?.globalFilterEntitySet ?? '';
    }
    return mainEntity;
}

/**
 * Get first backend configuration from ui5.yaml
 *
 * @param fs - mem-fs editor
 * @param projectRoot - Root path of the project
 * @returns Backend configuration object
 */
export function getFirstBackend(
    fs: Editor,
    projectRoot: string
): {
    destination?: string;
    sapClient?: string;
    scp?: boolean;
    url?: string;
} {
    let result: { destination?: string; sapClient?: string; scp?: boolean; url?: string } = {};

    try {
        const yamlJSON = parse(readFile(fs, join(projectRoot, 'ui5.yaml')));
        const proxyMiddleware = yamlJSON?.server?.customMiddleware.filter((customMiddleware: any) => {
            return (
                customMiddleware?.name === 'fiori-tools-proxy' ||
                customMiddleware?.name === 'ui5-middleware-simpleproxy' // used in tool-suite beta
            );
        });

        if (proxyMiddleware?.[0]?.configuration) {
            const backends: any[] = proxyMiddleware?.[0]?.configuration?.backend;
            // handle beta projects config
            if (proxyMiddleware?.[0]?.configuration?.baseUri) {
                result.url = yamlJSON?.server?.customMiddleware?.[0]?.configuration?.baseUri;
            } else if (backends?.length === 1) {
                result = backends[0];
            } else if (backends?.length > 1) {
                // pick the "best" backend
                result = backends.find((backend: any) => backend?.path === '/sap') ?? backends?.[0];
            }
        }
    } catch (error: unknown) {
        // Expected: ui5.yaml may not exist or may have different structure
    }
    return result;
}
