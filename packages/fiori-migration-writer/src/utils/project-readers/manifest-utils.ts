/**
 * Utilities for manifest.json parsing and analysis
 * Handles FE version detection, floor plan determination, and semantic objects
 */

import { join } from 'node:path';
import { parse } from 'yaml';
import { fileExists, readFile } from '../../index.js';
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
        const firstInboundKey = Object.keys(manifest['sap.app'].crossNavigation.inbounds)?.[0] as any;

        if (manifest['sap.app'].crossNavigation.inbounds[firstInboundKey]) {
            const firstInbound = manifest['sap.app'].crossNavigation.inbounds[firstInboundKey];
            result = `${firstInbound?.semanticObject}-${firstInbound?.action}`;
        }
    }
    return result;
}

/**
 * Extract FLP intent from HTML file (flpSandbox.html or similar)
 *
 * @param htmlFilePath - Path to HTML file
 * @returns FLP intent string or undefined
 */
export async function getFlpIntentFromHtml(htmlFilePath: string): Promise<string | undefined> {
    let flpIntent;

    try {
        if (await fileExists(htmlFilePath)) {
            const flpSandboxContent: any = await readFile(htmlFilePath);
            const key = 'window["sap-ushell-config"] = {';
            if (flpSandboxContent?.indexOf(key) !== -1) {
                const posOfkey = flpSandboxContent.indexOf(key);
                const lenOfKey = key.length;
                const posStartOfValue = posOfkey + lenOfKey;
                const posEndOfValue = flpSandboxContent.indexOf('};', posStartOfValue);
                const flpSandboxConfig = flpSandboxContent.substring(posStartOfValue - 1, posEndOfValue + 1);
                // Add quotes to properties - ReDoS-safe approach using indexOf/substring instead of regex
                // This completely avoids regex backtracking vulnerabilities
                const lines = flpSandboxConfig.split('\n');
                const processedLines = lines.map((line: string) => {
                    const colonPos = line.indexOf(':');
                    if (colonPos === -1) {
                        return line;
                    }
                    // Extract property name part before colon
                    const beforeColon = line.substring(0, colonPos).trim();
                    // Remove any existing quotes - explicit grouping for clarity
                    const propName = beforeColon.replace(/(?:^['"])|(?:['"]$)/g, '');
                    // Only process if it looks like a valid property name (word characters)
                    if (/^\w+$/.test(propName)) {
                        // Reconstruct line with proper JSON quotes
                        const afterColon = line.substring(colonPos);
                        const indentRegex = /^\s*/;
                        const indentMatch = indentRegex.exec(line);
                        const indent = indentMatch?.[0] || '';
                        return `${indent}"${propName}"${afterColon}`;
                    }
                    return line;
                });
                const flpSandboxConfigCleaned = processedLines.join('\n').replace('-"', '-');
                let flpSandboxConfigJSON = {} as any;
                try {
                    flpSandboxConfigJSON = JSON.parse(flpSandboxConfigCleaned);
                } catch {
                    // ignore error
                }
                if (flpSandboxConfigJSON?.applications && Object.keys(flpSandboxConfigJSON?.applications)?.[0]) {
                    flpIntent = Object.keys(flpSandboxConfigJSON?.applications)?.[0];
                }
            }
        }
    } catch {
        // Do  nothing
    }
    return flpIntent;
}

/**
 * Determine floor plan from manifest and FE version
 *
 * @param manifest - Manifest object
 * @param feVersion - Fiori Elements version
 * @returns Floor plan identifier
 * @throws Error if not suitable for migration
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
        throw new Error(i18nText('ERROR_NOT_SUITABLE_FOR_MIGRATION'));
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
 * @param projectRoot - Root path of the project
 * @returns Backend configuration object
 */
export async function getFirstBackend(
    projectRoot: string
): Promise<{ destination?: string; sapClient?: string; scp?: boolean; url?: string }> {
    let result: { destination?: string; sapClient?: string; scp?: boolean; url?: string } = {};

    try {
        const yamlJSON = parse(await readFile(join(projectRoot, 'ui5.yaml')));
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
                result = backends.filter((backend: any) => backend?.path === '/sap')?.[0];
                if (!result) {
                    result = backends?.[0];
                }
            }
        }
    } catch {
        // Do nothing
    }
    return result;
}
