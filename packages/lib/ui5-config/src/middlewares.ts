import type { MiddlewareConfig, NodeComment, Path } from './types';
import type { OdataService } from '@sap/ux-odata-service-template';
import { join } from 'path';
import { UI5Config } from './ui5-config';
import type { Editor } from 'mem-fs-editor';

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
    data: OdataService,
    useUi5Cdn = true
): {config: MiddlewareConfig[], comments: NodeComment<MiddlewareConfig>[]} => {
    const destination = data.destination?.name || undefined;
    const destinationInstance = data.destination?.instance || undefined;

    const pathSegments = data.path.split('/').filter((s: string) => s !== '');
    const fioriToolsProxy: MiddlewareConfig = {
        name: 'fiori-tools-proxy',
        afterMiddleware: 'compression',
        configuration: {
            ignoreCertError: false,
            backend: [
                {
                    path: `/${pathSegments[0]}`,
                    url: data.url,
                    destination,
                    destinationInstance
                }
            ]
        }
    };
    if (useUi5Cdn === true) {
        fioriToolsProxy.configuration['ui5'] = {
            path: ['/resources', '/test-resources'],
            url: 'https://ui5.sap.com',
            version: ''
        };
    }
    const config: MiddlewareConfig[] = [fioriToolsProxy];

    const comments: NodeComment<MiddlewareConfig>[] = [
        {
            path: 'configuration.ignoreCertError',
            comment:
                ' If set to true, certificate errors will be ignored. E.g. self-signed certificates will be accepted'
        },
        {
            path: 'configuration.ui5.version' as Path<MiddlewareConfig>,
            comment: ' The UI5 version, for instance, 1.78.1. null means latest version'
        }
    ];

    return {config, comments};
};

export const getMockServerMiddlewareConfig = (data: OdataService): MiddlewareConfig[] => {
    const pathSegments = data.path.split('/');
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
		comments?: NodeComment<MiddlewareConfig>[],
): Promise<void> => {
    // update filename e.g. ui5.yaml
    const ui5ConfigPath = join(basePath, filename);
    const existingUI5Config = fs.read(ui5ConfigPath);

    const ui5Config = await UI5Config.newInstance(existingUI5Config);
    ui5Config.addCustomMiddleware(middlewares, comments);
    fs.write(ui5ConfigPath, ui5Config.toString());
};
