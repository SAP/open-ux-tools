import { type Destination, WebIDEUsage } from '@sap-ux/btp-utils';

// todo: move to btp utils
/**
 * Checks if the destination attributes WebIDEUsage is configured with odata_abap.
 *
 * @param destination destination info
 * @returns true, if this destination has the the 'odata_abap' attribute set
 */
export function isAbapODataDestination(destination: Destination): boolean {
    return (
        !!destination.WebIDEUsage?.includes(WebIDEUsage.ODATA_ABAP) &&
        !destination.WebIDEUsage?.includes(WebIDEUsage.ODATA_GENERIC)
    );
}
