import type Generator from 'yeoman-generator';
import type { ODataService, AbapServiceProvider, Annotations } from '@sap-ux/axios-extension';
import { createForAbap, createForDestination, ODataVersion } from '@sap-ux/axios-extension';
import type { OdataService } from '@sap-ux/odata-service-writer';

export interface ServiceInfo {
    url?: string;
    destination?: string;
    path: string;
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
        default: 'https://sapes5.sapdevcenter.com/sap/opu/odata/sap/SEPMRA_PROD_MAN?sap-client=002&saml2=disabled',
        validate: (answer) => !!answer
    });

    const serviceUrl = new URL(url);
    const params: { [key: string]: string } = {};
    serviceUrl.searchParams.forEach((value, key) => (params[key] = value));
    const provider = createForAbap({
        baseURL: serviceUrl.origin,
        ignoreCertErrors: true,
        params
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
    metadata: string;
    annotations?: OdataService['annotations'];
}> {
    const service = provider.service<ODataService>(path);
    let metadata: string | undefined;
    let annotations: Annotations[] = [];
    while (!metadata) {
        try {
            metadata = await service.metadata();
            annotations = await provider.catalog(ODataVersion.v2).getAnnotations({ path });
        } catch (error: any) {
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
    return {
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
