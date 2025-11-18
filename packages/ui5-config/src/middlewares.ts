import { join, posix, relative, sep } from 'node:path';
import type {
    FioriToolsProxyConfigBackend,
    CustomMiddleware,
    FioriAppReloadConfig,
    FioriToolsProxyConfig,
    MockserverConfig,
    FioriToolsProxyConfigUI5,
    FioriPreviewConfig,
    DataSourceConfig,
    MockserverService
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
 * @param previewConfigOpts - The options for configuring the preview middleware.
 * @param {string} previewConfigOpts.ui5Theme - The theme to be used for the application.dedededdedeededededededdededdeddedededededed
 * @param {string} previewConfigOpts.appId - The ID of the application for which the preview middleware is being configured.
 * @param {string} previewConfigOpts.flpAction - The action to be used for the Fiori launchpad.
 * @param {string} previewConfigOpts.localStartFile - The local start file to be used for the application.
 * @returns {CustomMiddleware<FioriPreviewConfig>} The configuration object for the middleware.
 */
export function getPreviewMiddlewareConfig({
    ui5Theme,
    appId,
    flpAction,
    localStartFile
}: {
    ui5Theme?: string;
    appId?: string;
    flpAction?: string;
    localStartFile?: string;
}): CustomMiddleware<FioriPreviewConfig> {
    const fioriPreviewConfig: CustomMiddleware<FioriPreviewConfig> = {
        name: 'fiori-tools-preview',
        afterMiddleware: 'fiori-tools-appreload',
        configuration: {
            flp: {
                ...(ui5Theme && { theme: ui5Theme })
            }
        }
    };

    if (localStartFile) {
        fioriPreviewConfig.configuration.flp.path = localStartFile;
    }

    if (appId && flpAction) {
        fioriPreviewConfig.configuration.flp.intent = {
            object: appId.replace(/[._-]/g, ''),
            action: flpAction
        };
    }

    return fioriPreviewConfig;
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
 * @param ignoreCertErrors ignore certificate errors
 * @returns {{config, comments}} configuration and comments
 */
export function getFioriToolsProxyMiddlewareConfig(
    backends?: FioriToolsProxyConfigBackend[],
    ui5?: Partial<FioriToolsProxyConfigUI5>,
    afterMiddleware = 'compression',
    ignoreCertErrors: boolean = false
): {
    config: CustomMiddleware<FioriToolsProxyConfig>;
    comments: NodeComment<CustomMiddleware<FioriToolsProxyConfig>>[];
} {
    const fioriToolsProxy: CustomMiddleware<FioriToolsProxyConfig> = {
        name: 'fiori-tools-proxy',
        afterMiddleware,
        configuration: {
            ignoreCertErrors: ignoreCertErrors
        }
    };
    let comments: NodeComment<CustomMiddleware<FioriToolsProxyConfig>>[] = [
        {
            path: 'configuration.ignoreCertErrors',
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

export const getMockServerMiddlewareConfig = (
    basePath: string,
    webappPath: string,
    dataSourcesConfig: DataSourceConfig[],
    annotationsConfig: MockserverConfig['annotations']
): CustomMiddleware<MockserverConfig> => {
    const services: MockserverService[] = [];

    // Populate services based on dataSourcesConfig
    dataSourcesConfig.forEach((dataSource) => {
        const serviceRoot = `.${posix.sep}${relative(
            basePath,
            join(webappPath, 'localService', dataSource.serviceName)
        ).replaceAll(sep, posix.sep)}`;
        const newServiceData: MockserverService = {
            urlPath: dataSource.servicePath.replace(/\/$/, ''), // Mockserver is sensitive to trailing '/'
            metadataPath: dataSource.metadataPath ?? `${serviceRoot}/metadata.xml`,
            mockdataPath: `${serviceRoot}/data`,
            generateMockData: true
        };
        if (dataSource.resolveExternalServiceReferences === true) {
            newServiceData.resolveExternalServiceReferences = true;
        }
        services.push(newServiceData);
    });
    return {
        name: 'sap-fe-mockserver',
        beforeMiddleware: 'csp',
        configuration: {
            mountPath: '/',
            services,
            annotations: annotationsConfig
        }
    };
};
