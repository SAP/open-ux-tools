import type {
    FioriToolsProxyConfigBackend,
    CustomMiddleware,
    FioriAppReloadConfig,
    FioriToolsProxyConfig,
    MockserverConfig,
    FioriToolsProxyConfigUI5
} from './types';
import type { NodeComment } from '@sap-ux/yaml';

/**
 * Get the configuration for the AppReload middleware.
 *
 * @returns {CustomMiddleware<FioriAppReloadConfig>} the configuration
 */
export function getAppReloadMiddlewareConfig(): CustomMiddleware<FioriAppReloadConfig> {
    return {
        name: 'fiori-tools-appreload',
        afterMiddleware: 'compression',
        configuration: {
            port: 35729,
            path: 'webapp',
            delay: 300
        }
    };
}

/**
 * Returns default comments for the given backend configuration values.
 *
 * @param backend backend config
 * @param index - optional index of backend entry
 * @returns the node comments for the backend config
 */
export function getBackendComments(
    backend: FioriToolsProxyConfigBackend,
    index?: number
): NodeComment<CustomMiddleware<FioriToolsProxyConfig>>[] {
    const comment = [];

    if (backend.authenticationType === 'reentranceTicket') {
        comment.push({
            path: `configuration.backend.${index}.authenticationType`,
            comment: ' SAML support for vscode',
            key: 'authenticationType'
        });
    }
    return comment;
}

/**
 * Get the configuration for the Fiori tools middleware.
 *
 * @param backends configuration of backends
 * @param ui5 UI5 configuration
 * @param afterMiddleware middleware after which fiori-tools-proxy middleware will be started
 * @returns {{config, comments}} configuration and comments
 */
export function getFioriToolsProxyMiddlewareConfig(
    backends?: FioriToolsProxyConfigBackend[],
    ui5?: Partial<FioriToolsProxyConfigUI5>,
    afterMiddleware = 'compression'
): {
    config: CustomMiddleware<FioriToolsProxyConfig>;
    comments: NodeComment<CustomMiddleware<FioriToolsProxyConfig>>[];
} {
    const fioriToolsProxy: CustomMiddleware<FioriToolsProxyConfig> = {
        name: 'fiori-tools-proxy',
        afterMiddleware,
        configuration: {
            ignoreCertError: false
        }
    };
    let comments: NodeComment<CustomMiddleware<FioriToolsProxyConfig>>[] = [
        {
            path: 'configuration.ignoreCertError',
            comment:
                ' If set to true, certificate errors will be ignored. E.g. self-signed certificates will be accepted'
        }
    ];

    if (backends && backends.length > 0) {
        backends.forEach((element, index) => {
            element.path = element.path ?? '/';
            const backendComments = getBackendComments(element, index);
            if (backendComments) {
                comments = [...comments, ...backendComments];
            }
        });
        fioriToolsProxy.configuration.backend = backends;
    }

    if (ui5 !== undefined) {
        fioriToolsProxy.configuration['ui5'] = {
            path: ui5.path ?? ['/resources', '/test-resources'],
            url: ui5.url ?? 'https://ui5.sap.com'
        };
        if (ui5.version !== undefined) {
            fioriToolsProxy.configuration['ui5'].version = ui5.version;
        }
        if (ui5.directLoad) {
            fioriToolsProxy.configuration['ui5'].directLoad = true;
        }
    }

    return { config: fioriToolsProxy, comments };
}

const handleServicesForMiddlewareConfig = (
    forceAddService: boolean,
    services: MockserverConfig['services'] = [],
    path?: string
): MockserverConfig['services'] => {
    const serviceData = {
        urlPath: path ?? '',
        metadataPath: './webapp/localService/metadata.xml',
        mockdataPath: './webapp/localService/data',
        generateMockData: true
    };
    if (forceAddService) {
        return [serviceData];
    } else if (services.length === 0) {
        // some dummy data (later overwritten with real service data) to make sure there is always service defined
        const placeholderService = {
            urlPath: path ?? '',
            metadataPath: 'metadataPath',
            // mockdata path should not be generated in case no mock data exists
            mockdataPath: 'mockdataPath',
            // In case of update, this user value should not be overwritten
            generateMockData: true
        };
        return [placeholderService];
    } else {
        // check if service with given path already exists
        let existingServiceIndex: number = -1;
        services.forEach((service, index: number) => {
            if (service.urlPath === path) {
                existingServiceIndex = index;
            }
        });
        if (existingServiceIndex > -1) {
            services[existingServiceIndex] = serviceData;
        } else {
            return [...services, serviceData];
        }
    }
};

export const getMockServerMiddlewareConfig = (
    services: MockserverConfig['services'],
    path?: string,
    annotationsConfig: MockserverConfig['annotations'] = [],
    forceAddService = false
): CustomMiddleware<MockserverConfig> => {
    path = path?.replace(/\/$/, ''); // Mockserver is sensitive to trailing '/'
    return {
        name: 'sap-fe-mockserver',
        beforeMiddleware: 'csp',
        configuration: {
            mountPath: '/',
            services: handleServicesForMiddlewareConfig(forceAddService, services, path),
            annotations: annotationsConfig
        }
    };
};
