import type Generator from 'yeoman-generator';
import type { AxiosBasicCredentials } from 'axios';
import type { ODataService, AbapServiceProvider, Annotations } from '@sap-ux/axios-extension';
import { createForAbap, createForDestination, ODataVersion } from '@sap-ux/axios-extension';
import type { OdataService } from '@sap-ux/odata-service-writer';
import { getService, BackendSystem, BackendSystemKey } from '@sap-ux/store';

export interface ServiceInfo {
    url?: string;
    destination?: string;
    path: string;
    odataVersion: ODataVersion;
    metadata: string;
    annotations?: OdataService['annotations'];
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
        default: generator.config.get('url'),
        validate: (answer) => !!answer
    });

    const serviceUrl = new URL(url);
    // extract params
    const params: { [key: string]: string } = {};
    serviceUrl.searchParams.forEach((value, key) => (params[key] = value));

    const provider = createForAbap({
        baseURL: serviceUrl.origin,
        ignoreCertErrors: true,
        params,
        auth: await getCredentials(serviceUrl.origin, params['sap-client'])
    });

    return {
        url: serviceUrl.origin,
        path: serviceUrl.pathname,
        ...(await getMetadata(generator, provider, serviceUrl.pathname))
    };
}

/**
 * Check the secure storage if it has credentials for teh entered url.
 *
 * @param url target system url
 * @param client optional sap-client parameter
 * @returns credentials or undefined
 */
async function getCredentials(url: string, client?: string): Promise<AxiosBasicCredentials | undefined> {
    const systemService = await getService<BackendSystem, BackendSystemKey>({ entityName: 'system' });
    const system = await systemService.read(new BackendSystemKey({ url, client }));
    return system?.username ? { username: system.username, password: system.password || '' } : undefined;
}

/**
 * Ask the user whether the credentials should be stored. If yes, store them in the secure storage.
 *
 * @param generator generator reference used for prompting
 * @param provider service provider for which the credentials should be stored
 */
async function storeCredentials(generator: Generator, provider: AbapServiceProvider) {
    const { storeCreds, name }: { storeCreds: boolean; name: string } = await generator.prompt([
        {
            type: 'confirm',
            name: 'storeCreds',
            message: 'Do you want to store your credentials in the secure storage?',
            default: true
        },
        {
            type: 'input',
            name: 'name',
            message: 'System name:',
            default: new URL(provider.defaults.baseURL!).hostname,
            validate: (answer) => !!answer
        }
    ]);
    if (storeCreds) {
        try {
            const systemService = await getService<BackendSystem, BackendSystemKey>({ entityName: 'system' });
            const system = new BackendSystem({
                name,
                url: provider.defaults.baseURL!,
                client: provider.defaults.params?.['sap-client'],
                username: provider.defaults.auth?.username,
                password: provider.defaults.auth?.password
            });
            await systemService.write(system);
        } catch (error) {
            generator.log(`Couldn't store credentials. ${error}`);
        }
    }
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
            default: generator.config.get('destination'),
            validate: (answer) => !!answer
        },
        {
            type: 'input',
            name: 'path',
            message: 'Service path',
            default: generator.config.get('path'),
            validate: (answer) => !!answer
        }
    ]);

    const provider = createForDestination({}, { Name: destination, WebIDEUsage: 'abap' }) as AbapServiceProvider;
    return {
        destination,
        path,
        ...(await getMetadata(generator, provider, path))
    };
}

/**
 * Tries fetching metadata from the given service and prompts for user/password if a 401 is returned.
 *
 * @param generator an instance of a yeoman generator
 * @param provider service provider
 * @param path path of the service
 * @returns service metadata
 */
export async function getMetadata(
    generator: Generator,
    provider: AbapServiceProvider,
    path: string
): Promise<{
    odataVersion: ODataVersion;
    metadata: string;
    annotations?: OdataService['annotations'];
}> {
    const service = provider.service<ODataService>(path);
    let metadata: string | undefined;
    let odataVersion: ODataVersion = ODataVersion.v2;
    let annotations: Annotations[] = [];
    let newCredentials = false;
    while (!metadata) {
        try {
            metadata = await service.metadata();
            odataVersion = metadata?.includes('Version="4.0"') ? ODataVersion.v4 : ODataVersion.v2;
            annotations = await provider.catalog(odataVersion).getAnnotations({ path });
            if (newCredentials && service.defaults.auth) {
                provider.defaults.auth = service.defaults.auth;
                await storeCredentials(generator, provider);
            }
        } catch (error: any) {
            if (error.cause?.status === 401) {
                if (service.defaults?.auth?.username) {
                    generator.log.error(error.cause.statusText);
                }
                const { username, password } = await generator.prompt([
                    {
                        type: 'input',
                        name: 'username',
                        message: 'Username',
                        default: generator.config.get('username'),
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
                newCredentials = true;
            } else {
                throw error;
            }
        }
    }
    return {
        odataVersion,
        metadata,
        annotations:
            annotations?.length > 0
                ? {
                      technicalName: annotations[0].TechnicalName,
                      xml: annotations[0].Definitions
                  }
                : undefined
    };
}
