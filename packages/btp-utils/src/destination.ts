/**
 * Support destination authentication types
 */
export enum Authentication {
    BASIC_AUTHENTICATION = 'BasicAuthentication',
    CLIENT_CERT_AUTHENTICATION = 'ClientCertificateAuthentication',
    NO_AUTHENTICATION = 'NoAuthentication',
    OAUTH2_CLIENT_CREDENTIALS = 'OAuth2ClientCredentials',
    OAUTH2_JWT_BEARER = 'OAuth2JWTBearer',
    OAUTH2_PASSWORD = 'OAuth2Password',
    OAUTH2_REFRESH_TOKEN = 'OAuth2RefreshToken',
    OAUTH2_SAML_BEARER_ASSERTION = 'OAuth2SAMLBearerAssertion',
    OAUTH2_USER_TOKEN_EXCHANGE = 'OAuth2UserTokenExchange',
    SAML_ASSERTION = 'SAMLAssertion'
}

/**
 * Relevant values for display extended destination properties to the UI
 */
export enum Suffix {
    S4HC = 'S4HC',
    BTP = 'BTP'
}

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
export type DestinationProperty =
    | 'WebIDEEnabled'
    | 'WebIDESystem'
    | 'WebIDEUsage'
    | 'WebIDEAdditionalData'
    | 'sap-client'
    | 'sap-platform'
    | 'TrustAll'
    | 'HTML5.DynamicDestination';
export type AdditionalDestinationProperties = { [property in DestinationProperty]: string };

/**
 * Mandatory destination properties combined with the known/relevant optional properties.
 */
export interface Destination extends Partial<AdditionalDestinationProperties> {
    Name: string;
    Type: string;
    Authentication: string;
    ProxyType: string;
    Description: string;
    /**
     * N.B. Not the host but the full destination URL property!
     */
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
 * @param destination destination info
 * @returns true, if this destination has HTML5.DynamicDestination configured
 */
export function isHTML5DynamicConfigured(destination: Destination): boolean {
    return Boolean(destination['HTML5.DynamicDestination']);
}

/**
 * Escape any special RegExp character that we want to use literally.
 *
 * @param str string input
 * @returns string a cleansed version of the input
 */
function escapeRegExp(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

/**
 * Trim, cleanse and return a system name appended with the appropriate suffix i.e. BTP | S4HC.
 *
 * @param destinationName name of the destination
 * @param suffix the appropriate suffix appended, BTP | S4HC
 * @returns string return an escaped string, appended with the appropriate suffix
 */
function addSuffix(destinationName: string, suffix: Suffix): string {
    const suffixStr = ` (${suffix})`;
    return RegExp(`${escapeRegExp(suffixStr)}$`).exec(destinationName.trim())
        ? destinationName
        : `${destinationName} (${suffix})`;
}

/**
 * Generate a display name using the destination name, username if supplied and the appropriate suffix i.e. BTP | S4HC.
 *
 * @param destination destination info
 * @param displayUsername name to display with destination
 * @returns string a newly generated string value with the name of the destination, username if present and the system type
 */
export function getDisplayName(destination: Destination, displayUsername?: string): string {
    const userDisplayName = displayUsername ? ` [${displayUsername}]` : '';
    let systemDisplayName: string;
    if (isAbapEnvironmentOnBtp(destination)) {
        systemDisplayName = addSuffix(destination.Name, Suffix.BTP);
    } else if (isS4HC(destination)) {
        systemDisplayName = addSuffix(destination.Name, Suffix.S4HC);
    } else {
        systemDisplayName = destination.Name;
    }
    return `${systemDisplayName}${userDisplayName}`;
}

/**
 * Checks whether the provided destination is configured to point to an S/4 HANA system.
 *
 * @param destination destination info
 * @returns boolean if the destination is configured for an SAP S/4HANA system
 */
export function isS4HC(destination: Destination): boolean {
    return Boolean(
        destination.WebIDEUsage?.includes(WebIDEUsage.ODATA_ABAP) &&
            destination.Authentication === Authentication.SAML_ASSERTION &&
            destination.ProxyType === ProxyType.INTERNET
    );
}

/**
 * Checks if the destination attributes WebIDEUsage is configured with odata_abap.
 * This is a non-strict check, as we want to maintain existing destinations, perhaps accidentally configured with both.s
 *
 * @param destination destination configuration properties
 * @returns true, if this destination has the the 'odata_abap' attribute set
 */
export function isAbapODataDestination(destination: Destination): boolean {
    return !!destination.WebIDEUsage?.includes(WebIDEUsage.ODATA_ABAP);
}
