import axios from 'axios';
import { cfGetInstanceKeyParameters } from '@sap/cf-tools';
import { ENV } from './app-studio.env';
import { Destination } from './destination';

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
export async function getUserForDestinationService(instance: string): Promise<string> {
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
 * @param path optional path
 */
export function getDestinationUrlForAppStudio(name: string, path?: string): string {
    const origin = `https://${name}.dest`;
    return path && path.length > 1 ? new URL(path, origin).toString() : origin;
}

export type Destinations = { [name: string]: Destination };

/**
 * Get a list of available destinations in SAP Business Application Studio
 */
export async function listDestinations(): Promise<Destinations> {
    const destinations: Destinations = {};
    await axios.get('/reload', { baseURL: process.env[ENV.PROXY_URL] });
    const response = await axios.get<Destination[]>('/api/listDestinations', { baseURL: process.env[ENV.H2O_URL] });
    const list = Array.isArray(response.data) ? response.data : [];
    list.forEach((destination) => {
        if (destination.WebIDEEnabled) {
            destinations[destination.Name] = destination;
        }
    });
    return destinations;
}
