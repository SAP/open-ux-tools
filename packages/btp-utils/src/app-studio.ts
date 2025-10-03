import type { Logger } from '@sap-ux/logger';
import { destinations as destinationAPI } from '@sap/bas-sdk';
import {
    apiCreateServiceInstance,
    apiGetInstanceCredentials,
    apiGetServicesInstancesFilteredByType,
    cfGetInstanceKeyParameters,
    cfGetTarget,
    type ServiceInstanceInfo
} from '@sap/cf-tools';
import axios from 'axios';
import { ENV } from './app-studio.env';
import {
    Authentication,
    type CloudFoundryServiceInfo,
    type Destination,
    DestinationProxyType,
    DestinationType,
    isS4HC,
    type ListDestinationOpts,
    OAuthUrlType
} from './destination';
import type { ServiceInfo } from './service-info';

/**
 * ABAP Cloud destination instance name.
 */
const DESTINATION_INSTANCE_NAME: string = 'abap-cloud-destination-instance';

/**
 * HTTP header that is to be used for encoded credentials when communicating with a destination service instance.
 */
export const BAS_DEST_INSTANCE_CRED_HEADER = 'bas-destination-instance-cred';

/**
 * Check if this is executed in SAP Business Application Studio.
 *
 * @returns true if yes
 */
export function isAppStudio(): boolean {
    return !!process.env[ENV.H2O_URL];
}

/**
 * Read and return the BAS proxy url.
 *
 * @returns the proxy url or undefined if called outside of BAS.
 */
export function getAppStudioProxyURL(): string | undefined {
    return process.env[ENV.PROXY_URL];
}

/**
 * Read and return the BAS base url.
 *
 * @returns the base url or undefined if called outside of BAS.
 */
export function getAppStudioBaseURL(): string | undefined {
    return process.env[ENV.H2O_URL];
}

/**
 * Asynchronously creates a base64 encoded credentials for the given destination service instance based on the client information fetched from BTP.
 *
 * @param instance name/id of the destination service instance
 * @returns the base64 encoded user
 */
export async function getCredentialsForDestinationService(instance: string): Promise<string> {
    try {
        const serviceInfo = await cfGetInstanceKeyParameters(instance);

        if (!serviceInfo) {
            throw new Error(`No destination instance ${instance} found`);
        }
        const serviceCredentials = serviceInfo.credentials;
        if (!serviceCredentials) {
            throw new Error(`No credentials for destination instance ${instance} found`);
        }
        const clientId = serviceCredentials.uaa?.clientid || serviceCredentials.clientid;
        const clientSecret = serviceCredentials.uaa?.clientsecret || serviceCredentials.clientsecret;
        return Buffer.from(`${encodeURIComponent(clientId)}:${encodeURIComponent(clientSecret)}`).toString('base64');
    } catch (error) {
        throw new Error(
            `An error occurred while retrieving service key for the destination instance ${instance}: ${error}`
        );
    }
}

/**
 * Returns a url for AppStudio for the given url with the given destination.
 *
 * @param name name of the destination
 * @param path optional path
 * @returns destination url working in BAS
 */
export function getDestinationUrlForAppStudio(name: string, path?: string): string {
    const origin = `https://${name}.dest`;
    return path && path.length > 1 ? new URL(path, origin).toString() : origin;
}

export type Destinations = { [name: string]: Destination };

/**
 * Helper function to strip `-api` from the host name.
 *
 * @param host -
 * @returns an updated string value, with `-api` removed
 */
function stripS4HCApiHost(host: string): string {
    const [first, ...rest] = host.split('.');
    return [first.replace(/-api$/, ''), ...rest].join('.');
}

/**
 * Get a list of available destinations in SAP Business Application Studio.
 *
 * @param options - options for the destinations
 * @returns the list of destinations
 */
export async function listDestinations(options?: ListDestinationOpts): Promise<Destinations> {
    const destinations: Destinations = {};
    await axios.get('/reload', { baseURL: process.env[ENV.PROXY_URL] });
    const response = await axios.get<Destination[]>('/api/listDestinations', { baseURL: process.env[ENV.H2O_URL] });
    const list = Array.isArray(response.data) ? response.data : [];
    list.forEach((destination) => {
        if (options?.stripS4HCApiHosts && isS4HC(destination)) {
            destination.Host = stripS4HCApiHost(destination.Host);
        }

        if (destination.WebIDEEnabled) {
            destinations[destination.Name] = destination;
        }
    });
    return destinations;
}

/**
 * Exposes port in SAP Business Application Studio.
 *
 * @param port Port that needs to be exposed
 * @param logger Logger
 * @returns url on which the port is exposed
 */
export async function exposePort(port: number, logger?: Logger): Promise<string> {
    try {
        const response = await axios.get(`http://localhost:3001/AppStudio/api/getHostByPort?port=${port}`);
        return `${response.data.result}`;
    } catch {
        logger?.error(`Port ${port} was not exposed!`);
        return '';
    }
}

/**
 * Transform a destination object into a TokenExchangeDestination destination, appended with UAA properties.
 *
 * @param destinationName name of the destination to be created
 * @param destinationDescription description of the destination to be created
 * @param credentials object representing the Client ID and Client Secret and token endpoint {@link ServiceInfo['uaa']}
 * @param hostUrl The full resolved cloud host instance url e.g. https://123bd07a-eda5-50bc-b11a-b1a7b88b632b.abap.somewhereaws.hanavlab.ondemand.com
 * @returns Populated OAuth destination
 */
function transformToBASSDKDestination(
    destinationName: string,
    destinationDescription: string,
    credentials: ServiceInfo['uaa'],
    hostUrl: string
): destinationAPI.DestinationInfo {
    const BASProperties = {
        usage: 'odata_abap,dev_abap,abap_cloud',
        html5DynamicDestination: 'true',
        html5Timeout: '60000'
    } as destinationAPI.BASProperties;

    const oauth2UserTokenExchange: destinationAPI.OAuth2UserTokenExchange = {
        clientId: credentials.clientid,
        clientSecret: credentials.clientsecret,
        tokenServiceURL: new URL('/oauth/token', credentials.url).toString(),
        tokenServiceURLType: OAuthUrlType.DEDICATED
    };

    return {
        name: destinationName,
        description: destinationDescription,
        url: new URL(hostUrl),
        type: DestinationType.HTTP,
        proxyType: DestinationProxyType.INTERNET,
        basProperties: BASProperties,
        credentials: {
            authentication: Authentication.OAUTH2_USER_TOKEN_EXCHANGE as destinationAPI.AuthenticationType,
            oauth2UserTokenExchange
        }
    } as destinationAPI.DestinationInfo;
}

/**
 * Generate a destination name representing the CF target the user is logged into i.e. abap-cloud-mydestination-myorg-mydevspace.
 *
 * @param name destination name
 * @returns formatted destination name using target space and target organisation
 */
export async function generateABAPCloudDestinationName(name: string): Promise<string> {
    const target = await cfGetTarget(true);
    if (!target.space) {
        throw new Error(`No Dev Space has been created for the subaccount.`);
    }
    const formattedInstanceName = `${name}-${target.org}-${target.space}`.replace(/\W/gi, '-').toLowerCase();
    return `abap-cloud-${formattedInstanceName}`.substring(0, 199);
}

/**
 *  Generate a new object representing an OAuth2 token exchange BTP destination.
 *
 * @param serviceInstanceName the service instance name on which the new destination will be based
 * @param uaaCredentials the credentials associated to the specified service instance {@link ServiceInfo['uaa']}
 * @param hostUrl the full resolved cloud host instance url e.g. https://123bd07a-eda5-50bc-b11a-b1a7b88b632b.abap.somewhereaws.hanavlab.ondemand.com
 * @param logger Logger
 * @returns Preconfigured OAuth destination
 */
async function generateOAuth2UserTokenExchangeDestination(
    serviceInstanceName: string,
    uaaCredentials: ServiceInfo['uaa'],
    hostUrl: string,
    logger?: Logger
): Promise<destinationAPI.DestinationInfo> {
    const generatedDestinationName: string = await generateABAPCloudDestinationName(serviceInstanceName);
    const instances: CloudFoundryServiceInfo[] = await apiGetServicesInstancesFilteredByType(['destination']);
    const destinationInstance = instances.find(
        (instance: CloudFoundryServiceInfo) => instance.label === DESTINATION_INSTANCE_NAME
    );

    if (!destinationInstance) {
        // Create a new abap-cloud destination instance on the target CF subaccount
        await apiCreateServiceInstance('destination', 'lite', DESTINATION_INSTANCE_NAME, null);
        logger?.info(`New ABAP destination instance ${DESTINATION_INSTANCE_NAME} created.`);
    }

    return transformToBASSDKDestination(
        generatedDestinationName,
        `Destination generated by App Studio for Cloud Foundry Abap service instance: '${serviceInstanceName}', Do not remove.`,
        uaaCredentials,
        hostUrl
    );
}

/**
 *  Creates a new SAP BTP subaccount destination of type 'OAuth2UserTokenExchange' using the specified `serviceInstanceName`
 *  param to generate a new destination name with the format: `abap-cloud-<serviceInstanceName>-<cfOrg>-<cfDevSpace>`.
 *  If the destination already exists, missing properties will be appended, existing fields are not updated with newer values.
 *  For example: If an existing SAP BTP destination already contains `WebIDEEnabled` and the value is set as `false`,
 *  the value will remain `false` even after the update. The specified `serviceInstanceInfo` parameter will be used as part of the destination name.
 *  If the param `uaaCredentials` is not provided, the function will attempt to retrieve the UAA properties from the specified service instance.
 *
 *  Exceptions: an exception will be thrown if the user is not logged into Cloud Foundry,
 *  ensure you are logged in using: `cf login -a https://<cf-api-endpoint-path> -o <cfOrg> -s <cfSpace>`
 *
 * @param serviceInstanceName The name of the service instance (returned in {@link ServiceInstanceInfo} as `label`, not the `serviceName` (technical name)),
 *  for example, as returned by the CF tools API: apiGetServicesInstancesFilteredByType {@link ServiceInstanceInfo}.
 * @param serviceCredentials
 * @param serviceCredentials.uaaCredentials object representing the Client ID and Client Secret and token endpoint {@link ServiceInfo['uaa']}
 * @param serviceCredentials.hostUrl The full resolved cloud host instance url e.g. https://123bd07a-eda5-50bc-b11a-b1a7b88b632b.abap.somewhereaws.hanavlab.ondemand.com
 *  Note: This is not necessarily the same as the credentials uaa url, which is used as the host part of the tokenServiceURL.
 * @param logger Logger
 * @returns the newly generated SAP BTP destination
 * @throws an error if the destination could not be created
 */
export async function createOAuth2UserTokenExchangeDest(
    serviceInstanceName: string,
    serviceCredentials?: { uaaCredentials: ServiceInfo['uaa']; hostUrl: string },
    logger?: Logger
): Promise<Destination> {
    if (!isAppStudio()) {
        throw new Error(`Creating a SAP BTP destinations is only supported on SAP Business Application Studio.`);
    }

    let serviceCredInfo = serviceCredentials;
    try {
        if (!serviceCredInfo) {
            const instanceDetails = await apiGetInstanceCredentials(serviceInstanceName);
            if (!instanceDetails?.credentials) {
                throw new Error(`Could not retrieve SAP BTP credentials for ${serviceInstanceName}.`);
            }
            serviceCredInfo = {
                uaaCredentials: instanceDetails.credentials.uaa as ServiceInfo['uaa'],
                hostUrl: instanceDetails.credentials.url
            };
        }

        const basSDKDestination: destinationAPI.DestinationInfo = await generateOAuth2UserTokenExchangeDestination(
            serviceInstanceName,
            serviceCredInfo.uaaCredentials,
            serviceCredInfo.hostUrl,
            logger
        );
        // Destination is created on SAP BTP but nothing is returned to validate this!
        await destinationAPI.createDestination(basSDKDestination);
        logger?.debug(`SAP BTP destination ${JSON.stringify(basSDKDestination, null, 2)} created.`);
        // Return updated destination from SAP BTP
        const destinations = await listDestinations();
        const newDestination = destinations?.[basSDKDestination.name];
        if (!newDestination) {
            throw new Error('Destination not found on SAP BTP.');
        }
        return newDestination;
    } catch (error) {
        throw new Error(`An error occurred while generating destination ${serviceInstanceName}: ${error}`);
    }
}
