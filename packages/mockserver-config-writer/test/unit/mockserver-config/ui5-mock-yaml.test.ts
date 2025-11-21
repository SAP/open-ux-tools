import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import type { Editor } from 'mem-fs-editor';
import { join } from 'node:path';
import { UI5Config } from '@sap-ux/ui5-config';
import type { MockserverConfig } from '@sap-ux/ui5-config/dist/types';
import { enhanceYaml } from '../../../src/mockserver-config/ui5-mock-yaml';

describe('Test enhanceYaml()', () => {
    const basePath = join('/');
    const ui5MockYamlPath = join(basePath, 'ui5-mock.yaml');
    const webappPath = join('/webapp');
    const manifestJsonPath = join(webappPath, 'manifest.json');
    const manifestWithMainService = `{"sap.ui5": { "models": { "": { "dataSource": "ds" } } },"sap.app": { "dataSources": { "ds": { "uri": "ds/uri/", "type": "OData" } } }}`;
    const mockManifestJson = `{
        "sap.app": {
            "id": "mockserverv2",
            "dataSources": {
                "mainService": {
                    "uri": "/sap/opu/odata/sap/SEPMRA_PROD_MAN/",
                    "type": "OData"
                },
                "SEPMRA_PROD_MAN": {
                    "uri": "/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/Annotations(TechnicalName='SEPMRA_PROD_MAN',Version='0001')/$value/",
                    "type": "ODataAnnotation",
                    "settings": {
                        "localUri": "localService/SEPMRA_PROD_MAN.xml"
                    }
                },
                "annotation": {
                    "type": "ODataAnnotation",
                    "uri": "annotations/annotation.xml",
                    "settings": {
                        "localUri": "annotations/annotation.xml"
                    }
                }
            }
        },
        "sap.ui5": {
            "models": {
                "": {
                    "dataSource": "mainService"
                }
            }
        }
    }`;
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('Create new ui5-mock.yaml with services and annotations from mock manifest.json', async () => {
        const fs = getFs({ [manifestJsonPath]: mockManifestJson });
        await enhanceYaml(fs, basePath, webappPath);

        expect(fs.read(ui5MockYamlPath)).toMatchSnapshot();

        const ui5Config = await UI5Config.newInstance(fs.read(ui5MockYamlPath));
        const mockserverConfig = ui5Config.findCustomMiddleware<MockserverConfig>('sap-fe-mockserver');
        expect(mockserverConfig?.configuration.services?.[0]).toStrictEqual({
            generateMockData: true,
            metadataPath: './webapp/localService/mainService/metadata.xml',
            mockdataPath: './webapp/localService/mainService/data',
            urlPath: '/sap/opu/odata/sap/SEPMRA_PROD_MAN'
        });
        expect(mockserverConfig?.configuration.annotations).toEqual([
            {
                localPath: './webapp/localService/SEPMRA_PROD_MAN.xml',
                urlPath:
                    "/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/Annotations(TechnicalName='SEPMRA_PROD_MAN',Version='0001')/$value/"
            }
        ]);
    });

    test('Create new ui5-mock.yaml with services and annotations from mock manifest.json in custom webapp', async () => {
        const customWebappPath = join(basePath, 'custom_webapp');
        const customManifestJsonPath = join(customWebappPath, 'manifest.json');

        const fs = getFs({ [customManifestJsonPath]: mockManifestJson });
        await enhanceYaml(fs, basePath, customWebappPath);

        const ui5Config = await UI5Config.newInstance(fs.read(ui5MockYamlPath));
        const mockserverConfig = ui5Config.findCustomMiddleware<MockserverConfig>('sap-fe-mockserver');
        expect(mockserverConfig?.configuration.services?.[0]).toStrictEqual({
            generateMockData: true,
            metadataPath: './custom_webapp/localService/mainService/metadata.xml',
            mockdataPath: './custom_webapp/localService/mainService/data',
            urlPath: '/sap/opu/odata/sap/SEPMRA_PROD_MAN'
        });
        expect(mockserverConfig?.configuration.annotations).toEqual([
            {
                localPath: './custom_webapp/localService/SEPMRA_PROD_MAN.xml',
                urlPath:
                    "/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/Annotations(TechnicalName='SEPMRA_PROD_MAN',Version='0001')/$value/"
            }
        ]);
    });

    test('Update ui5-mock.yaml, path and service name from manifest', async () => {
        const fs = getFsWithUi5MockYaml(manifestWithMainService);
        await enhanceYaml(fs, basePath, webappPath);
        expect(fs.read(ui5MockYamlPath)).toMatchSnapshot();
    });

    test('Update ui5-mock.yaml, path and service name from manifest with annotations', async () => {
        const fs = getFsWithUi5MockYaml(mockManifestJson);
        await enhanceYaml(fs, basePath, webappPath);
        expect(fs.read(ui5MockYamlPath)).toMatchSnapshot();
    });

    test('Update old ui5-mock.yaml with service overwrite', async () => {
        const fs = getFsWithUi5MockYaml(mockManifestJson);
        await enhanceYaml(fs, basePath, webappPath, { overwrite: true });
        expect(fs.read(ui5MockYamlPath)).toMatchSnapshot();
    });

    test('Create new ui5-mock.yaml based on ui5.yaml, updated with services and annotations', async () => {
        const fs = getFsWithUi5Yaml(mockManifestJson);
        await enhanceYaml(fs, basePath, webappPath);
        expect(fs.read(ui5MockYamlPath)).toMatchSnapshot();
        // additional check of urlPath, even if snapshot test get lightheartedly updated, the urlPath should remain stable.
        const ui5Config = await UI5Config.newInstance(fs.read(ui5MockYamlPath));
        expect(
            ui5Config.findCustomMiddleware<MockserverConfig>('sap-fe-mockserver')?.configuration.services?.[0]
        ).toStrictEqual({
            generateMockData: true,
            metadataPath: './webapp/localService/mainService/metadata.xml',
            mockdataPath: './webapp/localService/mainService/data',
            urlPath: '/sap/opu/odata/sap/SEPMRA_PROD_MAN'
        });
        expect(
            ui5Config.findCustomMiddleware<MockserverConfig>('sap-fe-mockserver')?.configuration.annotations
        ).toEqual([
            {
                localPath: './webapp/localService/SEPMRA_PROD_MAN.xml',
                urlPath:
                    "/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/Annotations(TechnicalName='SEPMRA_PROD_MAN',Version='0001')/$value/"
            }
        ]);
    });

    test('Create new ui5-mock.yaml based on ui5.yaml, updated with services and annotations with value list references', async () => {
        const fs = getFsWithUi5Yaml(mockManifestJson);
        await enhanceYaml(fs, basePath, webappPath, { resolveExternalServiceReferences: { mainService: true } });
        expect(fs.read(ui5MockYamlPath)).toMatchSnapshot();
        // additional check of urlPath, even if snapshot test get lightheartedly updated, the urlPath should remain stable.
        const ui5Config = await UI5Config.newInstance(fs.read(ui5MockYamlPath));
        expect(
            ui5Config.findCustomMiddleware<MockserverConfig>('sap-fe-mockserver')?.configuration.services?.[0]
        ).toStrictEqual({
            generateMockData: true,
            metadataPath: './webapp/localService/mainService/metadata.xml',
            mockdataPath: './webapp/localService/mainService/data',
            urlPath: '/sap/opu/odata/sap/SEPMRA_PROD_MAN',
            resolveExternalServiceReferences: true
        });
        expect(
            ui5Config.findCustomMiddleware<MockserverConfig>('sap-fe-mockserver')?.configuration.annotations
        ).toEqual([
            {
                localPath: './webapp/localService/SEPMRA_PROD_MAN.xml',
                urlPath:
                    "/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/Annotations(TechnicalName='SEPMRA_PROD_MAN',Version='0001')/$value/"
            }
        ]);
    });

    test('Create new ui5-mock.yaml based on ui5.yaml and manifest without dataSources', async () => {
        const fs = getFsWithUi5Yaml('{}');
        await enhanceYaml(fs, basePath, webappPath);
        expect(fs.read(ui5MockYamlPath)).toMatchSnapshot();
        // additional check of urlPath, even if snapshot test get lightheartedly updated, the urlPath should remain stable.
        const ui5Config = await UI5Config.newInstance(fs.read(ui5MockYamlPath));
        // manifest without dataSources are used, so no services added
        expect(
            ui5Config.findCustomMiddleware<MockserverConfig>('sap-fe-mockserver')?.configuration.services
        ).toStrictEqual([]);
    });

    test('Create new ui5-mock.yaml without app name and dataSources in manifest.json', async () => {
        const fs = getFs({ [manifestJsonPath]: '{}' });
        await enhanceYaml(fs, basePath, webappPath);
        expect(fs.read(ui5MockYamlPath)).toMatchSnapshot();
        // additional check of urlPath, even if snapshot test get lightheartedly updated, the urlPath should remain stable.
        const ui5Config = await UI5Config.newInstance(fs.read(ui5MockYamlPath));
        // manifest without dataSources are used, so no services added
        expect(
            ui5Config.findCustomMiddleware<MockserverConfig>('sap-fe-mockserver')?.configuration.services
        ).toStrictEqual([]);
    });

    test(`Should throw error in case new added middleware can't be found by name 'sap-fe-mockserver'`, async () => {
        jest.spyOn(UI5Config, 'newInstance').mockResolvedValue({
            addMockServerMiddleware: jest.fn(),
            findCustomMiddleware: () => undefined
        } as unknown as UI5Config);
        const fs = getFsWithUi5MockYaml('{}');
        await expect(enhanceYaml(fs, basePath, webappPath, { overwrite: true })).rejects.toThrow('mockserver');
    });

    function getFs(files: { [path: string]: string }): Editor {
        const fs = create(createStorage());
        for (const filePath in files) {
            fs.write(filePath, files[filePath]);
        }
        return fs;
    }

    function getFsWithUi5MockYaml(manifestContent: string): Editor {
        return getFs({
            [ui5MockYamlPath]: `specVersion: '2.0'
metadata:
  name: 'app'
type: application
server:
  customMiddleware:
  - name: middleware-before
  - name: sap-fe-mockserver
    beforeMiddleware: fiori-tools-proxy
    configuration:
      services:
        - urlPath: /some/previous/service/uri
          metadataXmlPath: ./webapp/localService/previous-service/metadata.xml
          mockdataRootPath: ./webapp/localService/previous-service/data
          generateMockData: true
      annotations: []
  - name: middleware-after`,
            [manifestJsonPath]: manifestContent
        });
    }

    function getFsWithUi5Yaml(manifestContent: string): Editor {
        return getFs({
            [join(
                basePath,
                'ui5.yaml'
            )]: `# yaml-language-server: $schema=https://sap.github.io/ui5-tooling/schema/ui5.yaml.json

specVersion: "2.5"
metadata:
  name: dummy.application
type: application
server:
  customMiddleware:
    - name: first-middleware
      firstProp: firstValue
      nested:
        nestedPropA: nestedValueA # comment for nested value A
        list:
        - listValueA
        - listValueB
    - name: second-middleware`,
            [manifestJsonPath]: manifestContent
        });
    }
});
