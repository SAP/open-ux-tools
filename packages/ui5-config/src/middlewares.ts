import type {
    FioriToolsProxyConfigBackend,
    CustomMiddleware,
    FioriAppReloadConfig,
    FioriToolsProxyConfig,
    MockserverConfig,
    FioriToolsProxyConfigUI5,
    FioriPreviewConfig
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
 * Generates the configuration for a Fiori preview middleware.
 *
 * @param {string} appId - The ID of the application for which the preview middleware is being configured.
 * @param {string} ui5Theme - The theme to be used for the application.
 * @returns {CustomMiddleware<FioriPreviewConfig>} The configuration object for the middleware.
 */
export function getPreviewMiddlewareConfig(appId: string, ui5Theme: string): CustomMiddleware<FioriPreviewConfig> {
    return {
        name: 'fiori-tools-preview',
        afterMiddleware: 'fiori-tools-appreload',
        configuration: {
            component: appId,
            ui5Theme: ui5Theme
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
 * @param ignoreCertError ignore certificate errors
 * @returns {{config, comments}} configuration and comments
 */
export function getFioriToolsProxyMiddlewareConfig(
    backends?: FioriToolsProxyConfigBackend[],
    ui5?: Partial<FioriToolsProxyConfigUI5>,
    afterMiddleware = 'compression',
    ignoreCertError: boolean = false
): {
    config: CustomMiddleware<FioriToolsProxyConfig>;
    comments: NodeComment<CustomMiddleware<FioriToolsProxyConfig>>[];
} {
    const fioriToolsProxy: CustomMiddleware<FioriToolsProxyConfig> = {
        name: 'fiori-tools-proxy',
        afterMiddleware,
        configuration: {
            ignoreCertError: ignoreCertError
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
    serviceName?: string,
    servicePath?: string,
    services: MockserverConfig['services'] = []
): MockserverConfig['services'] => {
    const metadataPath = serviceName
        ? `./webapp/localService/${serviceName}/metadata.xml`
        : `./webapp/localService/metadata.xml`;
    const mockdataPath = serviceName ? `./webapp/localService/${serviceName}/data` : `./webapp/localService/data`;
    const serviceData = {
        urlPath: servicePath ?? '',
        metadataPath,
        mockdataPath,
        generateMockData: true
    };
    // Check if service with given paths already exists or placeholder service exists
    const existingServiceIndex: number = services.findIndex(
        (service) =>
            (service.urlPath === servicePath && service.metadataPath === metadataPath) || service.urlPath === ''
    );
    if (existingServiceIndex > -1) {
        services[existingServiceIndex] = serviceData;
        return services;
    } else {
        return [...services, serviceData];
    }
};

export const getMockServerMiddlewareConfig = (
    serviceName?: string,
    servicePath?: string,
    existingServices: MockserverConfig['services'] = [],
    annotationsConfig: MockserverConfig['annotations'] = []
): CustomMiddleware<MockserverConfig> => {
    servicePath = servicePath?.replace(/\/$/, ''); // Mockserver is sensitive to trailing '/'
    return {
        name: 'sap-fe-mockserver',
        beforeMiddleware: 'csp',
        configuration: {
            mountPath: '/',
            services: handleServicesForMiddlewareConfig(serviceName, servicePath, existingServices),
            annotations: annotationsConfig
        }
    };
};
