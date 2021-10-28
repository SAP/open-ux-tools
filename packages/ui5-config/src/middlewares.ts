import type {
    ProxyBackend,
    CustomMiddleware,
    FioriAppReloadConfig,
    FioriToolsProxyConfig,
    MockserverConfig,
    ProxyUIConfig
} from './types';
import type { NodeComment } from '@sap-ux/yaml';

/**
 * @returns {FioriAppReloadConfig}
 */
export function getAppReloadMiddlewareConfig(): CustomMiddleware<FioriAppReloadConfig> {
    return {
        name: 'fiori-tools-appreload',
        afterMiddleware: 'compression',
        configuration: {
            port: 35729,
            path: 'webapp'
        }
    };
}

export const getUi5ProxyConfig = (
    ui5: ProxyUIConfig
): {
    config: CustomMiddleware<FioriToolsProxyConfig>;
    comments: NodeComment<CustomMiddleware<FioriToolsProxyConfig>>[];
} => {
    const config: CustomMiddleware<FioriToolsProxyConfig> = {
        name: 'fiori-tools-proxy',
        afterMiddleware: 'compression',
        configuration: {
            ignoreCertError: false
        }
    };
    const comments: NodeComment<CustomMiddleware<FioriToolsProxyConfig>>[] = [];
    config.configuration['ui5'] = {
        path: ['/resources', '/test-resources'],
        url: ui5.url || 'https://ui5.sap.com',
        version: ui5.version || ''
    };
    if (ui5.directLoad) {
        config.configuration['ui5'].directLoad = true;
    }
    comments.push({
        path: 'configuration.ui5.version',
        comment: ' The UI5 version, for instance, 1.78.1. Empty string means latest version'
    });
    return { config, comments };
};

/**
 * @param backends
 * @param ui5
 * @returns {{config, comments}}
 */
export function getFioriToolsProxyMiddlewareConfig(
    backends?: ProxyBackend[],
    ui5?: ProxyUIConfig
): {
    config: CustomMiddleware<FioriToolsProxyConfig>;
    comments: NodeComment<CustomMiddleware<FioriToolsProxyConfig>>[];
} {
    const fioriToolsProxy: CustomMiddleware<FioriToolsProxyConfig> = {
        name: 'fiori-tools-proxy',
        afterMiddleware: 'compression',
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
        backends.forEach((element) => {
            element.path = element.path || '/';
        });
        fioriToolsProxy.configuration.backend = backends;
    }

    if (ui5 !== undefined) {
        const { config, comments: ui5Comments } = getUi5ProxyConfig(ui5);
        fioriToolsProxy.configuration['ui5'] = config.configuration['ui5'];
        comments = comments.concat(ui5Comments);
    }

    return { config: fioriToolsProxy, comments };
}

export const getMockServerMiddlewareConfig = (path?: string): CustomMiddleware<MockserverConfig> => {
    const pathSegments = path?.split('/') || [];
    return {
        name: 'sap-fe-mockserver',
        beforeMiddleware: 'fiori-tools-proxy',
        configuration: {
            service: {
                urlBasePath: pathSegments.slice(0, -1).join('/'),
                name: pathSegments[pathSegments.length - 1],
                metadataXmlPath: './webapp/localService/metadata.xml',
                mockdataRootPath: './webapp/localService/data',
                generateMockData: true
            }
        }
    };
};
