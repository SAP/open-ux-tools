/**
 * Helper functions for processing neo-app configuration and determining OData version
 */
import type { ManifestNamespace } from '../project-spec-types.js';
import { FioriElementsVersion } from '../project-spec-types.js';
import type { NeoappDestination } from '../types.js';
import { ODataVersion } from '../types.js';

/**
 * Result of neo-app and OData version processing
 */
export interface NeoAppAndODataResult {
    destination: string;
    firstNeoAppDestination: string | undefined;
    neoAppUI5Version: string | undefined;
    neoappDestinations: NeoappDestination[];
    sapClient: string;
    odataVersion: ODataVersion;
}

/**
 * Process neo-app configuration and determine OData version
 * Handles destination extraction, UI5 version, and OData version determination
 *
 * @param projectRoot - Root path of the project
 * @param existingDestination - Existing destination value
 * @param existingSapClient - Existing sapClient value
 * @param mainServiceDatasource - Main service datasource from manifest
 * @param feVersion - Fiori Elements version
 * @param getDestinationFromNeoApp - Function to get destination from neo-app.json
 * @param getClientFromDestinationName - Function to extract client from destination name
 * @returns Neo-app and OData version result
 */
export async function processNeoAppAndODataVersion(
    projectRoot: string,
    existingDestination: string,
    existingSapClient: string,
    mainServiceDatasource: Partial<ManifestNamespace.DataSource>,
    feVersion: FioriElementsVersion | undefined,
    getDestinationFromNeoApp: (
        projectRoot: string,
        destination: string
    ) => Promise<
        | {
              destination?: string;
              neoAppUI5Version?: string;
              neoappDestinations?: NeoappDestination[];
          }
        | undefined
    >,
    getClientFromDestinationName: (destination: string) => string
): Promise<NeoAppAndODataResult> {
    let destination = existingDestination;
    let firstNeoAppDestination: string | undefined;
    let neoappDestinations: NeoappDestination[] = [];
    let sapClient = existingSapClient;

    // Process neo-app.json
    const neoAppData = await getDestinationFromNeoApp(projectRoot, existingDestination);
    if (neoAppData?.destination) {
        destination = neoAppData.destination;
        firstNeoAppDestination = destination;
    }

    const neoAppUI5Version = neoAppData?.neoAppUI5Version;
    if (neoAppData?.neoappDestinations) {
        neoappDestinations = neoAppData.neoappDestinations;
    }
    if (!sapClient) {
        sapClient = getClientFromDestinationName(destination);
    }

    // Determine OData version
    const odataVersionTmp =
        parseInt((mainServiceDatasource?.settings as any)?.odataVersion || '', 10) === 4
            ? ODataVersion.v4
            : ODataVersion.v2; // Defaults to v2 if sapAppServiceVersion or projectInfo.FEVersion undefined or v2

    const odataVersion = feVersion === FioriElementsVersion.v4 ? ODataVersion.v4 : odataVersionTmp;

    return {
        destination,
        firstNeoAppDestination,
        neoAppUI5Version,
        neoappDestinations,
        sapClient,
        odataVersion
    };
}
