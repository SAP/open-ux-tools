import { MiddlewareConfig, NodeComment, Path } from '@sap/ux-ui5-config';
import { OdataService } from './types';

export const getMiddlewareConfig = (data: OdataService): [MiddlewareConfig[], NodeComment<MiddlewareConfig>[]] => {
    const destination = data.destination?.name || undefined;
    const destinationInstance = data.destination?.instance || undefined;

    const pathSegments = data.path.split('/').filter((s) => s !== '');
    const config: MiddlewareConfig[] = [
        {
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
                ],
                ui5: {
                    path: ['/resources', '/test-resources'],
                    url: 'https://ui5.sap.com',
                    version: null
                }
            }
        }
    ];

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

    return [config, comments];
};

export const getLocalMiddlewareConfig = (data: OdataService): MiddlewareConfig[] => {
    const localPath = data?.annotations?.technicalName
        ? `./webapp/localService/${data.annotations.technicalName}.xml`
        : undefined;
    const pathSegments = data.path.split('/');
    return [
        {
            name: 'sap-fe-mockserver',
            mountPath: '/',
            afterMiddleware: 'compression',
            configuration: {
                annotations: {
                    localPath,
                    urlPath: '/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/Annotations*'
                },
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
