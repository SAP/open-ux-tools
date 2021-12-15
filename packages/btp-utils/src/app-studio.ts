import { cfGetInstanceKeyParameters } from '@sap/cf-tools';
import axios from 'axios';
import { Destination } from './destination';

/**
 * Enumeration of environment variables used in AppStudio
 */
export enum ENV {
    PROXY_URL = 'HTTP_PROXY',
    H2O_URL = 'H2O_URL'
}

export function isAppStudio(): boolean {
    return !!process.env[ENV.H2O_URL];
}

export function getAppStudioProxyURL(): string | undefined {
    return process.env[ENV.PROXY_URL];
}

/**
 * Creates a base64 encoded user for the given destination service instance based on the client information fetched from BTP.
 *
 * @param instance name/id of the destination service instance
 */
async function getUserForDestinationService(instance: string): Promise<string> {
    try {
        const serviceInfo = await cfGetInstanceKeyParameters(instance);
        const clientId = serviceInfo.uaa?.clientid || serviceInfo.clientid;
        const clientSecret = serviceInfo.uaa?.clientsecret || serviceInfo.clientsecret;
        return Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    } catch (error) {
        throw new Error(
            `An error occurred while retrieving service key for the destination instance ${instance}: ${error}`
        );
    }
}
/**
 * Returns a url for AppStudio for the given url with the given destination
 *
 * @param name name of the destination
 * @param instance optional name of the destination service instance exposing the destination
 * @param path optional path
 */
export async function getDestinationUrlForAppStudio(name: string, instance?: string, path?: string): Promise<string> {
    const url = new URL(path && path.length > 1 ? path : '', `https://${name}.dest`);
    if (instance) {
        url.username = await getUserForDestinationService(instance);
    }
    return url.toString();
}

export type Destinations = { [name: string]: Destination };

/**
 * Get a list of available destinations in SAP Business Application Studio
 */
export async function listDestinations(): Promise<Destinations> {
    const destinations: Destinations = {};
    await axios.get('/reload', { baseURL: process.env[ENV.PROXY_URL] });
    const response = await axios.get<Destination[]>('/api/listDestinations', { baseURL: process.env[ENV.H2O_URL] });
    response?.data?.forEach((destination) => {
        if (destination.WebIDEEnabled) {
            destinations[destination.Name] = destination;
        }
    });
    return destinations;
}
