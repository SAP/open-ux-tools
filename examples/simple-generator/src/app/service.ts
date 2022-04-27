import type Generator from 'yeoman-generator';
import type { ODataService, AbapServiceProvider } from '@sap-ux/axios-extension';
import { createServiceForUrl, createForDestination } from '@sap-ux/axios-extension';

export interface ServiceInfo {
    url?: string;
    destination?: string;
    path: string;
    metadata: string;
}

/**
 * Prompts the user for a service url and tries connecting to it to fetch metadata.
 *
 * @param generator an instance of a yeoman generator
 * @returns a service configuration
 */
export async function getServiceInfo(generator: Generator): Promise<ServiceInfo> {
    const { url } = await generator.prompt({
        type: 'input',
        name: 'url',
        message: 'Service url',
        default: 'https://sapes5.sapdevcenter.com/sap/opu/odata/sap/SEPMRA_PROD_MAN',
        validate: (answer) => !!answer
    });

    const serviceUrl = new URL(url);
    const service = createServiceForUrl(url, {
        ignoreCertErrors: true
    });

    return {
        url: serviceUrl.origin,
        path: serviceUrl.pathname,
        metadata: await getMetadata(generator, service)
    };
}

/**
 * Prompts the user for a destination and tries connecting to it to fetch metadata.
 *
 * @param generator an instance of a yeoman generator
 * @returns a service configuration
 */
export async function getServiceInfoInBAS(generator: Generator): Promise<ServiceInfo> {
    const { destination, path } = await generator.prompt([
        {
            type: 'input',
            name: 'destination',
            message: 'Destination',
            validate: (answer) => !!answer
        },
        {
            type: 'input',
            name: 'path',
            message: 'Service path',
            validate: (answer) => !!answer
        }
    ]);

    const provider = createForDestination({}, destination) as AbapServiceProvider;
    return {
        destination,
        path,
        metadata: await getMetadata(generator, provider.service<ODataService>(path))
    };
}

/**
 * Tries fetching metadata from the given service and prompts for user/password if a 401 is returned.
 *
 * @param generator an instance of a yeoman generator
 * @param service
 * @returns service metadata
 */
export async function getMetadata(generator: Generator, service: ODataService): Promise<string> {
    let metadata: string;
    while (!metadata) {
        try {
            metadata = await service.metadata();
        } catch (error) {
            if (service.defaults?.auth?.username) {
                generator.log.error(error.cause.statusText);
            }
            if (error.cause.status === 401) {
                const { username, password } = await generator.prompt([
                    {
                        type: 'input',
                        name: 'username',
                        message: 'Username',
                        validate: (answer) => !!answer
                    },
                    {
                        type: 'password',
                        name: 'password',
                        message: 'Password',
                        validate: (answer) => !!answer
                    }
                ]);
                service.defaults.auth = {
                    username,
                    password
                };
            } else {
                throw error;
            }
        }
    }
    return metadata;
}
