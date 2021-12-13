import { cfGetInstanceKeyParameters } from '@sap/cf-tools';
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
 * Creates a URL to be used when doing requests against instance based destinations
 *
 * @param destination name of the destination
 * @param destinationInstance name of the destination instance as provided in the mta.yaml
 */
async function getUrlForInstanceBasedDest(destination: string, destinationInstance: string): Promise<string> {
    try {
        const serviceInfo = await cfGetInstanceKeyParameters(destinationInstance);
        const clientId = serviceInfo.uaa?.clientid || serviceInfo.clientid;
        const clientSecret = serviceInfo.uaa?.clientsecret || serviceInfo.clientsecret;
        const base64Client = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
        return `https://${base64Client}@${destination}.dest`;
    } catch (error) {
        throw new Error(
            `An error occurred while retrieving service key for the destination instance ${destinationInstance}: ${error}`
        );
    }
}
/**
 * Returns a url for AppStudio for the given url with the given destination
 *
 * @param url url string
 * @param destinationName name of the destination
 * @param destinationInstance name of the destination instance as provided in the mta.yaml
 */
export async function getDestinationUrlForAppStudio(destination: Destination, instance?: string): Promise<string> {
    if (instance) {
        return getUrlForInstanceBasedDest(destination.Name, instance);
    } else {
        return new URL(new URL(destination.Host).pathname, `https://${destination.Name}.dest`).toString();
    }
}
