import { join } from 'node:path';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import {
    FileName,
    getAllUi5YamlFileNames,
    getMockDataPath,
    getMockServerConfig,
    getWebappPath,
    readUi5Yaml
} from '../../src';
import { readFile, writeFile } from 'fs/promises';

describe('Test getAllUi5YamlFileNames()', () => {
    const samplesRoot = join(__dirname, '..', 'test-data', 'project', 'webapp-path');

    test('Read list of Ui5 yaml files', async () => {
        const memFs = create(createStorage());

        expect((await getAllUi5YamlFileNames(join(samplesRoot, 'default-with-ui5-yaml'), memFs)).sort())
            .toMatchInlineSnapshot(`
            Array [
              "ui5-custom-multi.yaml",
              "ui5-custom.yaml",
              "ui5-local.yaml",
              "ui5-mock.yaml",
              "ui5.yaml",
            ]
        `);
    });

    test('Read list of Ui5 yaml files, including mem-fs changes', async () => {
        const memFs = create(createStorage());

        memFs.write(join(samplesRoot, 'default-with-ui5-yaml', 'ui5-something.yaml'), 'yet another test');
        memFs.delete(join(samplesRoot, 'default-with-ui5-yaml', 'ui5-custom.yaml'));

        const result = await getAllUi5YamlFileNames(join(samplesRoot, 'default-with-ui5-yaml'), memFs);
        expect(result.sort()).toMatchInlineSnapshot(`
            Array [
              "ui5-custom-multi.yaml",
              "ui5-local.yaml",
              "ui5-mock.yaml",
              "ui5-something.yaml",
              "ui5.yaml",
            ]
        `);
    });
});

describe('Test getWebappPath()', () => {
    const samplesRoot = join(__dirname, '..', 'test-data', 'project', 'webapp-path');

    test('Get webapp from default app', async () => {
        expect(await getWebappPath(join(samplesRoot, 'default-webapp-path'))).toEqual(
            join(samplesRoot, 'default-webapp-path', 'webapp')
        );
    });

    test('Get webapp from default app with ui5.yaml that does not contain a custom mapping', async () => {
        expect(await getWebappPath(join(samplesRoot, 'default-with-ui5-yaml'))).toEqual(
            join(samplesRoot, 'default-with-ui5-yaml', 'webapp')
        );
    });

    test('Get webapp from app with custom webapp mapping', async () => {
        expect(await getWebappPath(join(samplesRoot, 'custom-webapp-path'))).toEqual(
            join(samplesRoot, 'custom-webapp-path', 'src', 'webapp')
        );
    });

    test('Get webapp from app with custom webapp mapping in multi document yaml', async () => {
        expect(await getWebappPath(join(samplesRoot, 'custom-webapp-path-multi-yaml'))).toEqual(
            join(samplesRoot, 'custom-webapp-path-multi-yaml', 'src', 'webapp')
        );
    });

    test('Get custom webapp path from mem-fs editor instance', async () => {
        const memFs = create(createStorage());
        memFs.write(
            join(samplesRoot, 'custom-webapp-path/ui5.yaml'),
            'type: application\nresources:\n  configuration:\n    paths:\n      webapp: new/webapp/path'
        );
        memFs.writeJSON(join(samplesRoot, 'custom-webapp-path/package.json'), {});
        expect(await getWebappPath(join(samplesRoot, 'custom-webapp-path'), memFs)).toEqual(
            join(samplesRoot, 'custom-webapp-path/new/webapp/path')
        );
    });

    test('Get custom webapp path from mem-fs editor instance with custom webapp mapping in ui5.yaml', async () => {
        const memFs = create(createStorage());
        memFs.write(
            join(samplesRoot, 'app/app1/ui5.yaml'),
            'type: application\nresources:\n  configuration:\n    paths:\n      webapp: app/app1/webapp'
        );
        memFs.writeJSON(join(samplesRoot, 'package.json'), {});
        expect(await getWebappPath(join(samplesRoot, 'app/app1'), memFs)).toEqual(join(samplesRoot, 'app/app1/webapp'));
    });
});

describe('Test readUi5Yaml()', () => {
    const samplesRoot = join(__dirname, '..', 'test-data', 'project', 'webapp-path');

    test('Read existing Ui5 yaml file', async () => {
        expect(await readUi5Yaml(join(samplesRoot, 'custom-webapp-path'), FileName.Ui5Yaml)).toMatchInlineSnapshot(`
            UI5Config {
              "document": YamlDocument {
                "documents": Array [
                  Object {
                    "resources": Object {
                      "configuration": Object {
                        "paths": Object {
                          "webapp": "src/webapp",
                        },
                      },
                    },
                    "type": "application",
                  },
                ],
              },
            }
        `);
    });
    test('Read empty Ui5 yaml file', async () => {
        expect(await readUi5Yaml(join(samplesRoot, 'default-with-ui5-yaml'), FileName.Ui5Yaml)).toMatchInlineSnapshot(`
            UI5Config {
              "document": YamlDocument {
                "documents": Array [
                  null,
                ],
              },
            }
        `);
    });
    test('Read non-existing Ui5 yaml file', async () => {
        try {
            await readUi5Yaml(join(samplesRoot, 'default-webapp-path'), FileName.Ui5Yaml);
            fail('The function should have thrown an error.');
        } catch (error) {
            expect(error).toBeDefined();
        }
    });
    test('Read Ui5 yaml file from memory', async () => {
        const basePath = join(samplesRoot, 'default-webapp-path');

        const memFs = create(createStorage());
        memFs.write(join(basePath, 'myCustomUI5.yaml'), 'chicken-head');
        await readUi5Yaml(basePath, 'myCustomUI5.yaml', memFs);
        expect(memFs.read(join(basePath, 'myCustomUI5.yaml'))).toMatchInlineSnapshot('"chicken-head"');
    });
    test('Read Ui5 yaml file with schema validation (false)', async () => {
        const basePath = join(samplesRoot, 'default-webapp-path');

        const memFs = create(createStorage());
        memFs.write(join(basePath, 'myCustomUI5.yaml'), 'chicken-head');
        try {
            await readUi5Yaml(basePath, 'myCustomUI5.yaml', memFs, { validateSchema: true });
        } catch (error) {
            expect(error).toBeDefined();
        }
    });
    test('Read Ui5 yaml (multi-) file with schema validation (true)', async () => {
        const basePath = join(samplesRoot, 'default-with-ui5-yaml');
        expect(await readUi5Yaml(basePath, 'ui5-custom-multi.yaml', undefined, { validateSchema: true }))
            .toMatchInlineSnapshot(`
            UI5Config {
              "document": YamlDocument {
                "documents": Array [
                  Object {
                    "framework": Object {
                      "name": "SAPUI5",
                      "version": "1.124.0",
                    },
                    "metadata": Object {
                      "allowSapInternal": true,
                      "name": "com.sap.cap.fe.ts.sample",
                    },
                    "specVersion": "4.0",
                    "type": "application",
                  },
                  Object {
                    "kind": "extension",
                    "metadata": Object {
                      "name": "fiori-tools-preview",
                    },
                    "middleware": Object {
                      "path": "test",
                    },
                    "specVersion": "3.0",
                    "type": "server-middleware",
                  },
                ],
              },
            }
        `);
    });
});

describe('get configuration for sap-fe-mockserver', () => {
    const samplesRoot = join(__dirname, '..', 'test-data', 'project', 'webapp-path');
    const projectPath = join(samplesRoot, 'default-with-ui5-yaml');

    beforeEach(() => {
        // Reset the ui5-mock.yaml file to its original state before each test
        const ui5MockYamlPath = join(samplesRoot, 'default-with-ui5-yaml', FileName.Ui5MockYaml);
        return writeFile(
            ui5MockYamlPath,
            `
          specVersion: "3.1"
          metadata:
            name: managetravelfioriapp
          type: application
          server:
            customMiddleware:
              - name: fiori-tools-proxy
                afterMiddleware: compression
                configuration:
                  ignoreCertError: false
                  ui5:
                    path:
                      - /resources
                      - /test-resources
                    url: https://ui5.sap.com
                  backend:
                    - path: /sap
                      url: http://testsystem:port
              - name: fiori-tools-appreload
                afterMiddleware: compression
                configuration:
                  port: 35729
                  path: webapp
                  delay: 300
              - name: fiori-tools-preview
                afterMiddleware: fiori-tools-appreload
                configuration:
                  flp:
                    theme: sap_horizon
              - name: sap-fe-mockserver
                beforeMiddleware: csp
                configuration:
                  mountPath: /
                  services:
                    - urlPath: /sap/opu/odata4/sap/zz1ui_travels003_o4/srvd/sap/zz1ui_travels003_o4/0001
                      metadataPath: ./webapp/localService/mainService/metadata.xml
                      mockdataPath: ./webapp/localService/mainService/data
                      generateMockData: true
                  annotations: []
        `
        );
    });

    it('returns mock server configuration if middleware sap-fe-mockserver exists in UI5mockYaml', async () => {
        const result = await getMockServerConfig(projectPath);
        expect(result).toMatchInlineSnapshot(`
            Object {
              "annotations": Array [],
              "mountPath": "/",
              "services": Array [
                Object {
                  "generateMockData": true,
                  "metadataPath": "./webapp/localService/mainService/metadata.xml",
                  "mockdataPath": "./webapp/localService/mainService/data",
                  "urlPath": "/sap/opu/odata4/sap/zz1ui_travels003_o4/srvd/sap/zz1ui_travels003_o4/0001",
                },
              ],
            }
        `);
    });

    it('returns mock server configuration if middleware sap-fe-mockserver exists in Ui5LocalYaml', async () => {
        const result = await getMockServerConfig(projectPath, FileName.Ui5LocalYaml);
        expect(result).toMatchInlineSnapshot(`
            Object {
              "annotations": Array [],
              "mountPath": "/",
              "services": Array [
                Object {
                  "generateMockData": true,
                  "metadataPath": "./webapp/localService/mainService/metadata.xml",
                  "mockdataPath": "./webapp/localService/mainService/data",
                  "urlPath": "/sap/opu/odata4/sap/zz1ui_travels003_o4/srvd/sap/zz1ui_travels003_o4/0001",
                },
              ],
            }
        `);
    });

    it('returns mockdataPath from services', async () => {
        const result = await getMockDataPath(projectPath);
        expect(result).toBe('./webapp/localService/mainService/data');
    });

    it('returns mockdataPath from services', async () => {
        const result = await getMockDataPath(projectPath, FileName.Ui5LocalYaml);
        expect(result).toBe('./webapp/localService/mainService/data');
    });

    it('throws an error if middleware sap-fe-mockserver does not exist', async () => {
        try {
            // Temporarily remove the sap-fe-mockserver middleware from the ui5-mock.yaml file
            const ui5MockYamlPath = join(samplesRoot, 'default-with-ui5-yaml', FileName.Ui5MockYaml);
            const ui5MockYamlContent = await readFile(ui5MockYamlPath);
            const updatedContent = ui5MockYamlContent.toString().replace(
                `- name: sap-fe-mockserver
                beforeMiddleware: csp
                configuration:
                  mountPath: /
                  services:
                    - urlPath: /sap/opu/odata4/sap/zz1ui_travels003_o4/srvd/sap/zz1ui_travels003_o4/0001
                      metadataPath: ./webapp/localService/mainService/metadata.xml
                      mockdataPath: ./webapp/localService/mainService/data
                      generateMockData: true
                  annotations: []`,
                ''
            );
            await writeFile(ui5MockYamlPath, updatedContent);
            await getMockServerConfig(join(samplesRoot, 'default-with-ui5-yaml'));
        } catch (error) {
            expect(error).toBeDefined();
            expect(error.message).toBe('Could not find sap-fe-mockserver');
        }
    });

    it('returns empty mock data path if metadataPath is missing', async () => {
        const ui5MockYamlPath = join(samplesRoot, 'default-with-ui5-yaml', FileName.Ui5MockYaml);
        const ui5MockYamlContent = await readFile(ui5MockYamlPath);
        const updatedContent = ui5MockYamlContent.toString().replace(
            `metadataPath: ./webapp/localService/mainService/metadata.xml
                      mockdataPath: ./webapp/localService/mainService/data`,
            ''
        );
        await writeFile(ui5MockYamlPath, updatedContent);
        const result = await getMockDataPath(join(samplesRoot, 'default-with-ui5-yaml'));
        expect(result).toBe('');
    });
});
