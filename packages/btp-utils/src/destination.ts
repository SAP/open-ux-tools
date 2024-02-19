export enum ProxyType {
    ON_PREMISE = 'OnPremise',
    INTERNET = 'Internet',
    PRIVATE_LINK = 'PrivateLink'
}

/**
 * Relevant values for the WebIDEUsage property used to identify different types of destinations.
 */
export enum WebIDEUsage {
    ODATA_GENERIC = 'odata_gen',
    ODATA_ABAP = 'odata_abap',
    DEV_ABAP = 'dev_abap',
    ABAP_CLOUD = 'abap_cloud'
}

/**
 * Possible values for the WebIDEAdditionalData property
 */
export enum WebIDEAdditionalData {
    FULL_URL = 'full_url',
    API_MGMT = 'api_mgmt'
}

/**
 * Relevant values for DestinationProxyType property
 */
export enum DestinationProxyType {
    ON_PREMISE = 'OnPremise',
    INTERNET = 'Internet',
    PRIVATE_LINK = 'PrivateLink'
}

// Additional destination properties relevant for development
type DestinationProperty =
    | 'WebIDEEnabled'
    | 'WebIDESystem'
    | 'WebIDEUsage'
    | 'WebIDEAdditionalData'
    | 'sap-client'
    | 'sap-platform'
    | 'TrustAll'
    | 'HTML5.DynamicDestination';
type AdditionalDestinationProperties = { [property in DestinationProperty]: string };

/**
 * Mandatory destination properties combined with the known/relevant optional properties.
 */
export interface Destination extends Partial<AdditionalDestinationProperties> {
    Name: string;
    Type: string;
    Authentication: string;
    ProxyType: string;
    Description: string;
    Host: string;
}

/**
 * Checks whether the provided destination is configured to point to an ABAP system (both cloud and on-premise).
 *
 * @param destination destination info
 * @returns true of the destination is configured for an ABAP system
 */
export function isAbapSystem(destination: Partial<Destination>): boolean {
    return Boolean(
        destination.WebIDEUsage?.includes('abap') ||
            destination['sap-client'] ||
            destination['sap-platform']?.toLocaleLowerCase() === 'abap'
    );
}

/**
 * Checks whether the provided destination is configured to point to an ABAP environment on BTP (aka steampunk).
 *
 * @param destination destination info
 * @returns true of the destination is configured for a steampunk system
 */
export function isAbapEnvironmentOnBtp(destination: Destination): boolean {
    return Boolean(
        destination.WebIDEUsage?.includes(WebIDEUsage.ABAP_CLOUD) ||
            destination['sap-platform']?.toLocaleLowerCase() === 'abap'
    );
}

/**
 * Checks if the destination attributes WebIDEUsage is configured with odata_gen, and not odata_abap
 * We want to maintain existing destinations, perhaps accidentally configured with both, continue
 * working as abap catalogs.
 *
 * @param destination destination info
 * @returns true, if this destination has the the 'odata_gen', and not the 'odata_abap' attribute set
 */
export function isGenericODataDestination(destination: Destination): boolean {
    return Boolean(
        destination.WebIDEUsage?.includes(WebIDEUsage.ODATA_GENERIC) &&
            !destination.WebIDEUsage.includes(WebIDEUsage.ODATA_ABAP)
    );
}

/**
 * A destination configured as generic odata without the 'full_url' attribute are considered partial url destinations.
 *
 * @param destination destination info
 * @returns true, if this destination is generic odata and 'full_url' attribute is not set
 */
export function isPartialUrlDestination(destination: Destination): boolean {
    return Boolean(
        !destination.WebIDEAdditionalData?.includes(WebIDEAdditionalData.FULL_URL) &&
            isGenericODataDestination(destination)
    );
}

/**
 * A destination configured as generic odata WITH the 'full_url' attribute are considered full url destinations.
 *
 * @param destination destination info
 * @returns true, if this destination has the generic odata and 'full_url' attribute is set
 */
export function isFullUrlDestination(destination: Destination): boolean {
    return Boolean(
        destination.WebIDEAdditionalData?.includes(WebIDEAdditionalData.FULL_URL) &&
            isGenericODataDestination(destination)
    );
}

/**
 * Checks whether the provided destination is configured as an on-premise system.
 *
 * @param destination destination info
 * @returns true if the destination is configured as an on-premise system
 */
export function isOnPremiseDestination(destination: Destination): boolean {
    return Boolean(destination.ProxyType.includes(DestinationProxyType.ON_PREMISE));
}

/**
 * Validate if a destination has the property `HTML5.DynamicDestination` configured.
 *
 * @param destination
 * @returns true, if this destination has HTML5.DynamicDestination configured
 */
export function isHTML5DynamicConfigured(destination: Destination): boolean {
    return Boolean(destination['HTML5.DynamicDestination']);
}
