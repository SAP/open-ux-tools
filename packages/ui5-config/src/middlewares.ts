import type {
    ProxyBackend,
    CustomMiddleware,
    FioriAppReloadConfig,
    FioriToolsProxyConfig,
    MockserverConfig,
    ProxyUIConfig
} from './types';
import type { NodeComment, Path } from '@sap-ux/yaml';

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
    const comments: NodeComment<CustomMiddleware<FioriToolsProxyConfig>>[] = [
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
        fioriToolsProxy.configuration['ui5'] = {
            path: ['/resources', '/test-resources'],
            url: ui5.url || 'https://ui5.sap.com',
            version: ui5.version || ''
        };
        comments.push({
            path: 'configuration.ui5.version' as Path<CustomMiddleware<FioriToolsProxyConfig>>,
            comment: ' The UI5 version, for instance, 1.78.1. null means latest version'
        });
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
