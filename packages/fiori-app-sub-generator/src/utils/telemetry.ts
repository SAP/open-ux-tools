import { isOnPremiseDestination } from '@sap-ux/btp-utils';
import { ApiHubType, type TelemetryBusinessHubType, type TelemetrySapSystemType } from '../types';
import { isAbapCloud } from './common';
import type { ConnectedSystem } from '@sap-ux/odata-service-inquirer';

/**
 * Get the SAP system type as reported in telemetry events.
 *
 * @param connectedSystem
 * @returns
 */
export function getTelemetrySapSystemType(connectedSystem: ConnectedSystem): TelemetrySapSystemType | undefined {
    if (isAbapCloud(connectedSystem)) {
        return 'SCP'; // Legacy term, leaving as is to support telem conmtinuity
    }

    if (
        (connectedSystem?.destination && isOnPremiseDestination(connectedSystem.destination)) ||
        (connectedSystem?.backendSystem && !connectedSystem.backendSystem.serviceKeys)
    ) {
        return 'ABAP';
    }
    // This wont ever be the case now as all reentrance ticket based connections are to Abap Cloud regardless of how the system was discovered
    // This can probably be removed
    if (connectedSystem?.serviceProvider) {
        return 'CF';
    }
}

/**
 * Get the business hub type as reported in telemetry events.
 *
 * @param apiHubType
 * @returns
 */
export function getTelemetryBusinessHubType(apiHubType?: ApiHubType): TelemetryBusinessHubType | undefined {
    if (apiHubType === ApiHubType.apiHub) {
        return 'BusinessAcceleratorHub';
    } else if (apiHubType === ApiHubType.apiHubEnterprise) {
        return 'BusinessHubEnterprise';
    }
    return undefined;
}
