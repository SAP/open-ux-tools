import type { MiddlewareConfig } from './types';
import type { NodeComment, Path } from '@sap-ux/yaml';
import { join } from 'path';
import { UI5Config } from './ui5-config';
import type { Editor } from 'mem-fs-editor';
import { DEFAULT_HOST } from './constants';

export const getAppReloadMiddlewareConfig = (): MiddlewareConfig[] => {
    return [
        {
            name: 'fiori-tools-appreload',
            afterMiddleware: 'compression',
            configuration: {
                port: 35729,
                path: 'webapp'
            }
        }
    ];
};

export const getFioriToolsProxyMiddlewareConfig = (
    {
        url,
        path,
        destination,
        client
    }: { url?: string; path?: string; destination?: { name?: string; instance?: string }; client?: string },
    useUi5Cdn = true,
    ui5CdnUrl = 'https://ui5.sap.com',
    ui5Version = ''
): { config: MiddlewareConfig[]; comments: NodeComment<MiddlewareConfig>[] } => {
    const fioriToolsProxy: MiddlewareConfig = {
        name: 'fiori-tools-proxy',
        afterMiddleware: 'compression',
        configuration: {
            ignoreCertError: false
        }
    };

    if (url || path || destination?.name || destination?.instance) {
        const rootSegment = path?.split('/').filter((s: string) => s !== '')[0];
        const backend = {
            path: `/${rootSegment || ''}`,
            url: url ?? DEFAULT_HOST
        };
        if (client) {
            Object.assign(backend, { client: client });
        }
        if (destination?.name) {
            Object.assign(backend, { destination: destination.name });
        }
        if (destination?.instance) {
            Object.assign(backend, { destinationInstance: destination.instance });
        }
        fioriToolsProxy.configuration.backend = [backend];
    }
    if (useUi5Cdn === true) {
        fioriToolsProxy.configuration['ui5'] = {
            path: ['/resources', '/test-resources'],
            url: ui5CdnUrl,
            version: ui5Version ?? ''
        };
    }
    const config: MiddlewareConfig[] = [fioriToolsProxy];

    const comments: NodeComment<MiddlewareConfig>[] = [
        {
            path: 'configuration.ignoreCertError',
            comment:
                ' If set to true, certificate errors will be ignored. E.g. self-signed certificates will be accepted'
        }
    ];

    if (useUi5Cdn === true) {
        comments.push({
            path: 'configuration.ui5.version' as Path<MiddlewareConfig>,
            comment: ' The UI5 version, for instance, 1.78.1. null means latest version'
        });
    }

    return { config, comments };
};

export const getMockServerMiddlewareConfig = ({ path }: { path?: string }): MiddlewareConfig[] => {
    const pathSegments = path?.split('/') || [];
    return [
        {
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
        }
    ];
};

export const addMiddlewareConfig = async (
    fs: Editor,
    basePath: string,
    filename: string,
    middlewares: MiddlewareConfig[],
    comments?: NodeComment<MiddlewareConfig>[]
): Promise<void> => {
    // update filename e.g. ui5.yaml
    const ui5ConfigPath = join(basePath, filename);
    const existingUI5Config = fs.read(ui5ConfigPath);

    const ui5Config = await UI5Config.newInstance(existingUI5Config);
    ui5Config.addCustomMiddleware(middlewares, comments);
    fs.write(ui5ConfigPath, ui5Config.toString());
};
