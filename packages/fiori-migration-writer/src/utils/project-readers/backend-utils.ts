/**
 * Utilities for backend/destination configuration
 * Handles neo-app.json and destination settings
 */

import { join } from 'node:path';
import { TemplateFileName, fileExists, readJSON } from '../../index.js';
import type { NeoappDestination } from '../../types.js';
import { neoAppJsonRouteTargetTypes } from '../../types.js';

/**
 * Get client number from destination name if it ends with 3 digits
 *
 * @param destination - Destination name
 * @returns SAP client number or empty string
 */
export function getClientFromDestinationName(destination: string): string {
    let sapClient = '';
    if (destination && destination.length > 3) {
        const client = destination.slice(-3);
        // Check client is a number
        if (!isNaN(Number(client))) {
            sapClient = client;
        }
    }
    return sapClient;
}

/**
 * Extract destination, UI5 version, and destinations from neo-app.json data
 *
 * @param neoAppJson - Parsed neo-app.json content
 * @param destination - Initial destination (may be empty)
 * @param isUiAdaptation - Whether this is a UI adaptation project
 * @returns Destination info including UI5 version and destination list
 */
export function getNeoAppData(
    neoAppJson: any,
    destination: string,
    isUiAdaptation = false
): { destination: string; neoAppUI5Version: string | undefined; neoappDestinations: NeoappDestination[] } {
    let neoAppUI5Version;
    const neoappDestinations: NeoappDestination[] = [];
    const sapRoutes: string[] = [
        '/sap/opu/odata4',
        '/sap/opu/odata',
        '/sap/bc/lrep',
        '/sap/public/bc',
        '/sap/public/bc/NWDEMO_MODEL',
        '/sap/bc/ui5_ui5',
        '/sap/bc/ui2/app_index'
    ];

    neoAppJson.routes.forEach((route: any) => {
        // Pick the first destination in the routes
        if (route?.target?.type === neoAppJsonRouteTargetTypes.destination && route?.target?.name) {
            if (destination?.length === 0 || destination === undefined) {
                destination = route?.target?.name;
            }
            //filter out paths with /sap/other to avoid breaking app with empty url:"" as we add one /sap destination anyway
            if (
                !(route.path === route.target.entryPath && sapRoutes.includes(route.path)) &&
                route.path !== route.target.name &&
                !isUiAdaptation
            ) {
                //Grab all neo-app destinations
                neoappDestinations.push({
                    name: route?.target?.name,
                    path: route?.path,
                    entryPath: route?.target?.entryPath ?? '/'
                });
            }
        }

        // Check for UI5 Version in neo-app.json
        if (
            route?.path === `/resources` &&
            route?.target?.entryPath === '/resources' &&
            route?.target?.version?.length > 0
        ) {
            neoAppUI5Version = route.target.version;
        }
    });
    return { destination, neoAppUI5Version, neoappDestinations };
}

/**
 * Read destination info from neo-app.json file
 *
 * @param projectRoot - Root path of the project
 * @param destinationIn - Initial destination (may be empty)
 * @returns Destination info or undefined if no neo-app.json found
 */
export async function getDestinationFromNeoApp(
    projectRoot: string,
    destinationIn: string
): Promise<{ destination: string; neoAppUI5Version?: string; neoappDestinations?: NeoappDestination[] } | undefined> {
    try {
        const neoAppJsonPath = join(projectRoot, TemplateFileName.NeoApp);
        if (await fileExists(neoAppJsonPath)) {
            const neoAppJson: any = await readJSON(neoAppJsonPath);
            if (neoAppJson?.routes) {
                const { destination, neoAppUI5Version, neoappDestinations } = getNeoAppData(neoAppJson, destinationIn);
                return { destination, neoAppUI5Version, neoappDestinations };
            }
        }
    } catch {
        // do nothing. Probably no neo-app.json
    }
    return undefined;
}
