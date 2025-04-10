import { isOnPremiseDestination } from '@sap-ux/btp-utils';
import { ApiHubType, type TelemetryBusinessHubType, type Service, type TelemetrySapSystemType } from '../types';
import { isBTPHosted } from './common';

/**
 * Get the SAP system type as reported in telemetry events.
 *
 * @param connectedSystem
 * @returns
 */
export function getTelemetrySapSystemType(
    connectedSystem: Service['connectedSystem']
): TelemetrySapSystemType | undefined {
    if (isBTPHosted(connectedSystem)) {
        return 'SCP';
    }

    if (
        (connectedSystem?.destination && isOnPremiseDestination(connectedSystem.destination)) ||
        (connectedSystem?.backendSystem && !connectedSystem.backendSystem.serviceKeys)
    ) {
        return 'ABAP';
    }
    // The only remaining case is CF on VSCode
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
