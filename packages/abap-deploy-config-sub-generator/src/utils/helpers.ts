import { isAbapEnvironmentOnBtp, isAppStudio, listDestinations, isS4HC } from '@sap-ux/btp-utils';
import { DeploymentGenerator } from '@sap-ux/deploy-config-generator-shared';
import { AuthenticationType, getService } from '@sap-ux/store';
import type { AbapTarget } from '@sap-ux/ui5-config';
import type { BackendSystem, BackendSystemKey } from '@sap-ux/store';
import type { Destinations } from '@sap-ux/btp-utils';
import type { Logger } from '@sap-ux/logger';

let cachedDestinations: Destinations = {};
let cachedBackendSystems: BackendSystem[] = [];

/**
 * Small utility function to check whether the backend system keys are identical.
 *
 * @param backend  - backend system from the store
 * @param target - the abap target passed in
 * @returns true if the systems are the same
 */
function isSameSystem(backend: BackendSystem, target: AbapTarget): boolean {
    return (
        backend.url.trim().replace(/\/$/, '') === target.url?.trim().replace(/\/$/, '') &&
        (backend.client ?? '') === (target?.client ?? '')
    );
}

/**
 * Retrieve the destinations from SAP BTP.
 *
 * @returns destinations object
 */
async function getDestinations(): Promise<Destinations> {
    if (Object.keys(cachedDestinations)?.length === 0) {
        try {
            cachedDestinations = await listDestinations({ stripS4HCApiHosts: true });
        } catch (e) {
            DeploymentGenerator.logger.error(`Failed to fetch destinations. Error: ${e.message}`);
        }
    }
    return cachedDestinations;
}

/**
 * Retrieve the list of backend systems from the secure store.
 *
 * @returns list of backend systems
 */
async function getBackendSystems(): Promise<BackendSystem[]> {
    if (cachedBackendSystems?.length === 0) {
        try {
            const systemStore = await getService<BackendSystem, BackendSystemKey>({
                logger: DeploymentGenerator.logger as unknown as Logger,
                entityName: 'system'
            });
            cachedBackendSystems = await systemStore?.getAll();
        } catch (e) {
            DeploymentGenerator.logger.error(`Failed to fetch systems list. Error: ${e.message}`);
        }
    }
    return cachedBackendSystems;
}

/**
 * Retrieves the URL for the provided destination.
 *
 * @param destination - the destination name
 * @returns the URL of the destination or undefined if not found
 */
export async function determineUrlFromDestination(destination?: string): Promise<string | undefined> {
    let url;
    if (isAppStudio() && destination) {
        const destinations = await getDestinations();
        url = destinations?.[destination]?.Host;
    }
    return url;
}

/**
 * Determines if the ABAP target is a cloud system.
 *
 * @param target - abap target containing either a destination or a URL
 * @returns - true if the target is a cloud system, false otherwise
 */
export async function determineScpFromTarget(target: AbapTarget): Promise<boolean> {
    let isScp = false;
    if (isAppStudio() && target.destination) {
        const destinations = await getDestinations();
        if (destinations?.[target.destination]) {
            isScp = isAbapEnvironmentOnBtp(destinations?.[target.destination]);
        }
    } else if (target.url) {
        const backendSystems = await getBackendSystems();
        const backendSystem = backendSystems?.find((backend: BackendSystem) => isSameSystem(backend, target));
        isScp = !!backendSystem?.serviceKeys;
    }
    return isScp;
}

/**
 * Determine if the ABAP target is an S4 Hana Cloud system.
 *
 * @param target - abap target containing either a destination or a URL
 * @returns - true if the target is an s4hana cloud system, false otherwise
 */
export async function determineS4HCFromTarget(target: AbapTarget): Promise<boolean> {
    let isAbapCloud = false;
    if (isAppStudio() && target.destination) {
        const destinations = await getDestinations();
        if (destinations?.[target.destination]) {
            isAbapCloud = isS4HC(destinations?.[target.destination]);
        }
    } else if (target.url) {
        const backendSystems = await getBackendSystems();
        const backendSystem = backendSystems?.find((backend: BackendSystem) => isSameSystem(backend, target));
        isAbapCloud = backendSystem?.authenticationType === AuthenticationType.ReentranceTicket;
    }
    return isAbapCloud;
}
