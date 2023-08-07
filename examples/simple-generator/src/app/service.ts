import type Generator from 'yeoman-generator';
import type { AxiosBasicCredentials } from 'axios';
import type { ODataService, AbapServiceProvider, Annotations } from '@sap-ux/axios-extension';
import { createForDestination, ODataVersion } from '@sap-ux/axios-extension';
import type { OdataService } from '@sap-ux/odata-service-writer';
import { inquirer, storeCredentials, createAbapServiceProvider } from '@sap-ux/system-access';
import { getLogger } from './logger';

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

    const provider = await createAbapServiceProvider(
        {
            url: serviceUrl.origin,
            client: params['sap-client']
        },
        {
            ignoreCertErrors: true
        },
        true,
        getLogger(generator)
    );

    return {
        url: serviceUrl.origin,
        path: serviceUrl.pathname,
        ...(await getMetadata(generator, provider, serviceUrl.pathname))
    };
}

/**
 * Ask the user whether the credentials should be stored. If yes, store them in the secure storage.
 *
 * @param generator generator reference used for prompting
 * @param provider service provider for which the credentials should be stored
 */
async function askToStoreCredentials(generator: Generator, provider: AbapServiceProvider) {
    const { store, name } = await generator.prompt<{ store: boolean; name: string }>([
        inquirer.storeCredentials,
        {
            ...inquirer.systemName,
            default: new URL(provider.defaults.baseURL!).hostname
        }
    ]);
    if (store) {
        await storeCredentials(
            name,
            { url: provider.defaults.baseURL!, client: provider.defaults.params?.['sap-client'] },
            provider.defaults.auth!,
            getLogger(generator)
        );
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
                await askToStoreCredentials(generator, provider);
            }
        } catch (error: any) {
            if (error.cause?.status === 401) {
                if (service.defaults?.auth?.username) {
                    generator.log.error(error.cause.statusText);
                }
                service.defaults.auth = await generator.prompt<AxiosBasicCredentials>([
                    {
                        ...inquirer.username,
                        default: generator.config.get('username')
                    },
                    inquirer.password
                ]);
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
