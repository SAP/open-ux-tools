import axios from 'axios';
import { cfGetInstanceKeyParameters } from '@sap/cf-tools';
import type { Logger } from '@sap-ux/logger';
import { ENV } from './app-studio.env';
import { isS4HC, type Destination, type ListDestinationOpts } from './destination';

/**
 * HTTP header that is to be used for encoded credentials when communicating with a destination service instance.
 */
export const BAS_DEST_INSTANCE_CRED_HEADER = 'bas-destination-instance-cred';

/**
 * Check if this is exectued in SAP Business Application Studio.
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
