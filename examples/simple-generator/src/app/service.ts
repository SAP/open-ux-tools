import type Generator from 'yeoman-generator';
import type { ODataService, AbapServiceProvider, Annotations } from '@sap-ux/axios-extension';
import { createForAbap, createForDestination, ODataVersion } from '@sap-ux/axios-extension';
import type { OdataService } from '@sap-ux/odata-service-writer';

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
        default: 'https://sapes5.sapdevcenter.com/sap/opu/odata/sap/SEPMRA_PROD_MAN',
        validate: (answer) => !!answer
    });

    const serviceUrl = new URL(url);
    const provider = createForAbap({
        baseURL: serviceUrl.origin,
        ignoreCertErrors: true
    });

    return {
        url: serviceUrl.origin,
        path: serviceUrl.pathname,
        ...(await getMetadata(generator, provider, serviceUrl.pathname))
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
            default: 'ES5',
            validate: (answer) => !!answer
        },
        {
            type: 'input',
            name: 'path',
            message: 'Service path',
            default: '/sap/opu/odata/sap/SEPMRA_PROD_MAN',
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
    while (!metadata) {
        try {
            metadata = await service.metadata();
            odataVersion = metadata?.includes('Version="4.0"') ? ODataVersion.v4 : ODataVersion.v2;
            annotations = await provider.catalog(odataVersion).getAnnotations({ path });
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
