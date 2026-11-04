/**
 * Helper functions for detecting and extracting main service from manifest
 */
import type { Manifest } from '@sap-ux/project-access';
import { getMainService } from './index.js';

/**
 * Detect the main service from manifest datasources
 * Tries multiple strategies to find the primary OData service
 *
 * @param manifest - Manifest JSON object
 * @returns Main service name or 'mainService' as default
 */
export function detectMainServiceFromManifest(manifest: Manifest): string | undefined {
    let mainService = getMainService(manifest);

    if (mainService === undefined && manifest['sap.app']?.dataSources) {
        // mainService not found. try some more..
        const serviceKeys = Object.keys(manifest['sap.app']?.dataSources);
        if (serviceKeys.length === 1) {
            mainService = serviceKeys[0];
        } else if (serviceKeys.length > 1) {
            for (const serviceKey of serviceKeys) {
                if (
                    manifest['sap.app']?.dataSources[serviceKey] &&
                    (manifest['sap.app']?.dataSources[serviceKey].type === 'OData' ||
                        manifest['sap.app']?.dataSources[serviceKey].type === undefined)
                ) {
                    mainService = serviceKey;
                    break; // found a match exit the for loop.
                }
            }
        }
        if (mainService === undefined) {
            mainService = 'mainService'; //set a default datasource key since none other found
        }
    }

    return mainService;
}
