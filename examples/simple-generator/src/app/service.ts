import Generator from 'yeoman-generator';
import { ODataService, createServiceForUrl, createForDestination, AbapServiceProvider } from '@sap-ux/axios-extension';

export interface ServiceInfo {
    url?: string;
    destination?: string;
    path: string;
    metadata: string;
}

export async function getServiceInfo(generator: Generator): Promise<ServiceInfo> {
    const { url } = await generator.prompt({
        type: 'input',
        name: 'url',
        message: 'Service url',
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

export async function getMetadata(generator: Generator, service: ODataService): Promise<string> {
    let metadata: string;
    while (!metadata) {
        try {
            metadata = await service.metadata();
        } catch (error) {
            generator.log.error(error.cause.statusText);
            generator.log.info(error.cause);
            if (error.cause.status) {
                const { username, password } = await generator.prompt([
                    {
                        type: 'input',
                        name: 'username',
                        message: 'Username',
                        validate: (answer) => !!answer
                    },
                    {
                        type: 'input',
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
