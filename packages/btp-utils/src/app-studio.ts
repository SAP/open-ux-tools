import type { AxiosRequestConfig } from 'axios';
import axios from 'axios';
import {
    apiCreateServiceInstance,
    apiGetInstanceCredentials,
    apiGetServicesInstancesFilteredByType,
    cfGetInstanceKeyParameters,
    cfGetTarget
} from '@sap/cf-tools';
import type { Logger } from '@sap-ux/logger';
import { ENV } from './app-studio.env';
import {
    Authentication,
    type Destination,
    DestinationType,
    isS4HC,
    type ListDestinationOpts,
    OAuthUrlType,
    type CloudFoundryServiceInfo,
    type OAuth2Destination
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
 * @returns
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
    } catch (error) {
        logger?.error(`Port ${port} was not exposed!`);
        return '';
    }
}

/**
 * Transform a destination object into a TokenExchangeDestination destination, appended with UAA properties.
 *
 * @param destination destination info
 * @param credentials object representing the Client ID and Client Secret and token endpoint
 * @returns Populated OAuth destination
 */
export function transformToOAuthUserTokenExchange(
    destination: Destination,
    credentials: ServiceInfo['uaa']
): OAuth2Destination {
    const oauthDestination = {
        ...destination,
        Type: DestinationType.HTTP,
        Authentication: Authentication.OAUTH2_USER_TOKEN_EXCHANGE,
        URL: credentials.url,
        WebIDEEnabled: 'true',
        WebIDEUsage: 'odata_abap,dev_abap,abap_cloud',
        'HTML5.Timeout': '60000',
        'HTML5.DynamicDestination': 'true',
        tokenServiceURLType: OAuthUrlType.DEDICATED,
        tokenServiceURL: `${credentials.url}/oauth/token`,
        clientSecret: credentials.clientsecret,
        clientId: credentials.clientid
    } as OAuth2Destination;
    // Will be added as an additional property in BTP if not removed
    delete (oauthDestination as { Host?: string }).Host;
    return oauthDestination;
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
 * @param destination destination info
 * @param logger Logger
 * @returns Preconfigured OAuth destination
 */
async function generateOAuthTokenExchangeDestination(
    destination: Destination,
    logger?: Logger
): Promise<OAuth2Destination> {
    const destinationName: string = await generateABAPCloudDestinationName(destination.Name);
    const instances: CloudFoundryServiceInfo[] = await apiGetServicesInstancesFilteredByType(['destination']);
    const destinationInstance = instances.find(
        (instance: CloudFoundryServiceInfo) => instance.label === DESTINATION_INSTANCE_NAME
    );

    if (!destinationInstance) {
        // Create a new abap-cloud destination instance on the target CF subaccount
        await apiCreateServiceInstance('destination', 'lite', DESTINATION_INSTANCE_NAME, null);
        logger?.info(`New ABAP destination instance ${DESTINATION_INSTANCE_NAME} created on subaccount.`);
    }

    const instanceDetails = await apiGetInstanceCredentials(DESTINATION_INSTANCE_NAME);
    if (!instanceDetails?.credentials) {
        throw new Error(`Could not retrieve SAP BTP credentials.`);
    }
    return transformToOAuthUserTokenExchange(
        {
            ...destination,
            Description: `Destination generated by App Studio for '${destination.Name}', Do not remove.`,
            Name: destinationName
        },
        instanceDetails.credentials as ServiceInfo['uaa']
    );
}

/**
 *  Create a new SAP BTP subaccount destination of type 'OAuth2UserTokenExchange' using cf-tools to populate the UAA properties.
 *  This will overwrite the existing destination its associated properties, if already present on the CF subaccount.
 *
 * @param destination destination info
 * @param logger Logger
 */
export async function createBTPOAuthExchangeDestination(destination: Destination, logger?: Logger): Promise<void> {
    if (!isAppStudio()) {
        throw new Error(`Creating SAP BTP destinations is only supported on SAP Business Application Studio.`);
    }
    const btpDestination = await generateOAuthTokenExchangeDestination(destination, logger);
    await createBTPDestination(btpDestination);
}

/**
 * Create or update a SAP BTP subaccount destination.
 * If the destination already exists, there is no exception thrown and the existing properties defined in the destination are not updated nor removed by this request.
 *
 * @param destination destination info
 */
async function createBTPDestination(destination: Destination | OAuth2Destination): Promise<void> {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'Bas'
    };
    const reqConfig: AxiosRequestConfig = {
        method: 'post',
        url: `${getAppStudioBaseURL()}/api/createDestination`,
        headers,
        data: destination
    };
    await axios.request(reqConfig);
}
