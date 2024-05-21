import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import type { Editor } from 'mem-fs-editor';
import { join } from 'path';
import { UI5Config } from '@sap-ux/ui5-config';
import type { MockserverConfig } from '@sap-ux/ui5-config/dist/types';
import { enhanceYaml } from '../../../src/mockserver-config/ui5-mock-yaml';

describe('Test enhanceYaml()', () => {
    const basePath = join('/');
    const ui5MockYamlPath = join(basePath, 'ui5-mock.yaml');
    const webappPath = join('/webapp');
    const manifestJsonPath = join(webappPath, 'manifest.json');
    const manifestWithMainService = `{"sap.ui5": { "models": { "": { "dataSource": "ds" } } },"sap.app": { "dataSources": { "ds": { "uri": "ds/uri/" } } }}`;
    const mockManifestJson = `{
        "sap.app": {
            "id": "mockserverv2",
            "dataSources": {
                "mainService": {
                    "uri": "/sap/opu/odata/sap/SEPMRA_PROD_MAN/"
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
        }
    }`;
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('Create new ui5-mock.yaml with annotations from mock manifest.json', async () => {
        const fs = getFs({ [manifestJsonPath]: mockManifestJson });
        await enhanceYaml(fs, basePath, webappPath, { path: '/path/for/new/config' });

        expect(fs.read(ui5MockYamlPath)).toMatchSnapshot();

        const ui5Config = await UI5Config.newInstance(fs.read(ui5MockYamlPath));
        const mockserverConfig = ui5Config.findCustomMiddleware<MockserverConfig>('sap-fe-mockserver');
        expect(mockserverConfig?.configuration.services?.[0].urlPath).toBe('/path/for/new/config');
        expect(mockserverConfig?.configuration.annotations).toEqual([
            {
                localPath: './webapp/localService/SEPMRA_PROD_MAN.xml',
                urlPath:
                    "/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/Annotations(TechnicalName='SEPMRA_PROD_MAN',Version='0001')/$value/"
            },
            { localPath: './webapp/annotations/annotation.xml', urlPath: 'annotations/annotation.xml' }
        ]);
    });

    test('Update ui5-mock.yaml, path from manifest', async () => {
        const fs = getFsWithUi5MockYaml(manifestWithMainService);
        await enhanceYaml(fs, basePath, webappPath);
        expect(fs.read(ui5MockYamlPath)).toMatchSnapshot();
    });

    test('Update ui5-mock.yaml, path from manifest with annotations', async () => {
        const fs = getFsWithUi5MockYaml(mockManifestJson);
        await enhanceYaml(fs, basePath, webappPath);
        expect(fs.read(ui5MockYamlPath)).toMatchSnapshot();
    });

    test('Update old ui5-mock.yaml with given path', async () => {
        const fs = getFsWithUi5MockYaml('{}');
        await enhanceYaml(fs, basePath, webappPath, { path: 'path/to/service' });
        expect(fs.read(ui5MockYamlPath)).toMatchSnapshot();
    });

    test('Create new ui5-mock.yaml based on ui5.yaml, updated with annotations', async () => {
        const fs = getFsWithUi5Yaml(mockManifestJson);
        await enhanceYaml(fs, basePath, webappPath, { path: 'new/path/to/service' });
        expect(fs.read(ui5MockYamlPath)).toMatchSnapshot();
        // additional check of urlPath, even if snapshot test get lightheartedly updated, the urlPath should remain stable.
        const ui5Config = await UI5Config.newInstance(fs.read(ui5MockYamlPath));
        expect(
            ui5Config.findCustomMiddleware<MockserverConfig>('sap-fe-mockserver')?.configuration.services?.[0].urlPath
        ).toBe('new/path/to/service');
        expect(
            ui5Config.findCustomMiddleware<MockserverConfig>('sap-fe-mockserver')?.configuration.annotations
        ).toEqual([
            {
                localPath: './webapp/localService/SEPMRA_PROD_MAN.xml',
                urlPath:
                    "/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/Annotations(TechnicalName='SEPMRA_PROD_MAN',Version='0001')/$value/"
            },
            { localPath: './webapp/annotations/annotation.xml', urlPath: 'annotations/annotation.xml' }
        ]);
    });

    test('Create new ui5-mock.yaml based on ui5.yaml', async () => {
        const fs = getFsWithUi5Yaml('{}');
        await enhanceYaml(fs, basePath, webappPath, { path: 'new/path/to/service' });
        expect(fs.read(ui5MockYamlPath)).toMatchSnapshot();
        // additional check of urlPath, even if snapshot test get lightheartedly updated, the urlPath should remain stable.
        const ui5Config = await UI5Config.newInstance(fs.read(ui5MockYamlPath));
        expect(
            ui5Config.findCustomMiddleware<MockserverConfig>('sap-fe-mockserver')?.configuration.services?.[0].urlPath
        ).toBe('new/path/to/service');
    });

    test('Create new ui5-mock.yaml without app name in manifest.json', async () => {
        const fs = getFs({ [manifestJsonPath]: '{}' });
        await enhanceYaml(fs, basePath, webappPath, { path: '/path/for/new/config' });
        expect(fs.read(ui5MockYamlPath)).toMatchSnapshot();
        // additional check of urlPath, even if snapshot test get lightheartedly updated, the urlPath should remain stable.
        const ui5Config = await UI5Config.newInstance(fs.read(ui5MockYamlPath));
        expect(
            ui5Config.findCustomMiddleware<MockserverConfig>('sap-fe-mockserver')?.configuration.services?.[0].urlPath
        ).toBe('/path/for/new/config');
    });

    test(`Should throw error in case new added middleware can't be found by name 'sap-fe-mockserver'`, async () => {
        jest.spyOn(UI5Config, 'newInstance').mockResolvedValue({
            addMockServerMiddleware: jest.fn(),
            findCustomMiddleware: () => undefined
        } as unknown as UI5Config);
        const fs = getFsWithUi5MockYaml('{}');
        await expect(enhanceYaml(fs, basePath, webappPath)).rejects.toThrow('mockserver');
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
      service:
        urlBasePath: /some/previous/service/uri
        name: ''
        metadataXmlPath: ./webapp/localService/metadata.xml
        mockdataRootPath: ./webapp/localService/data
        generateMockData: true
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
