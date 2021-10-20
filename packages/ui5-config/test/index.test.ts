import {
    getMockServerMiddlewareConfig,
    getFioriToolsProxyMiddlewareConfig,
    getAppReloadMiddlewareConfig,
    addMiddlewareConfig,
    UI5Config
} from '../src';
import { create as createStorage } from 'mem-fs';
import { create, Editor } from 'mem-fs-editor';
import { join } from 'path';

describe('Fiori config utils', () => {
    const serviceData = {
        name: 'maintestService',
        path: '/testpath',
        url: 'http://localhost:8080',
        destination: { name: 'SIDCLNT000' }
    };
    beforeAll(() => {});

    test('getMockServerMiddlewareConfig', async () => {
        expect(getMockServerMiddlewareConfig(serviceData)).toMatchInlineSnapshot(`
            Array [
              Object {
                "beforeMiddleware": "fiori-tools-proxy",
                "configuration": Object {
                  "service": Object {
                    "generateMockData": true,
                    "metadataXmlPath": "./webapp/localService/metadata.xml",
                    "mockdataRootPath": "./webapp/localService/data",
                    "name": "testpath",
                    "urlBasePath": "",
                  },
                },
                "name": "sap-fe-mockserver",
              },
            ]
        `);
    });

    test('getFioriToolsProxyMiddlewareConfig', async () => {
        expect(getFioriToolsProxyMiddlewareConfig(serviceData)).toMatchInlineSnapshot(`
            Object {
              "comments": Array [
                Object {
                  "comment": " If set to true, certificate errors will be ignored. E.g. self-signed certificates will be accepted",
                  "path": "configuration.ignoreCertError",
                },
                Object {
                  "comment": " The UI5 version, for instance, 1.78.1. null means latest version",
                  "path": "configuration.ui5.version",
                },
              ],
              "config": Array [
                Object {
                  "afterMiddleware": "compression",
                  "configuration": Object {
                    "backend": Array [
                      Object {
                        "destination": "SIDCLNT000",
                        "path": "/testpath",
                        "url": "http://localhost:8080",
                      },
                    ],
                    "ignoreCertError": false,
                    "ui5": Object {
                      "path": Array [
                        "/resources",
                        "/test-resources",
                      ],
                      "url": "https://ui5.sap.com",
                      "version": "",
                    },
                  },
                  "name": "fiori-tools-proxy",
                },
              ],
            }
        `);
    });

    test('getAppReloadMiddlewareConfig', async () => {
        expect(getAppReloadMiddlewareConfig()).toMatchInlineSnapshot(`
            Array [
              Object {
                "afterMiddleware": "compression",
                "configuration": Object {
                  "path": "webapp",
                  "port": 35729,
                },
                "name": "fiori-tools-appreload",
              },
            ]
        `);
    });

    test('addMiddlewareConfig', async () => {
        const fs = create(createStorage());
        const basePath = '/tmptests';
        const filename = 'ui5-test.yaml';
        const filePath = join(basePath, filename);
        fs.write(filePath, '');
        const mw = getAppReloadMiddlewareConfig();
        await addMiddlewareConfig(fs, basePath, filename, mw);
        expect(fs.read(filePath)).toMatchInlineSnapshot(`
            "server:
              customMiddleware:
                - name: fiori-tools-appreload
                  afterMiddleware: compression
                  configuration:
                    port: 35729
                    path: webapp
            "
        `);
    });

    test('UI5Config addUI5Framework', async () => {
        const ui5Config = await UI5Config.newInstance('');
        ui5Config.addUI5Framework('1.64.0s', ['sap.m'], 'sap_belize');
        expect((await ui5Config).toString()).toMatchInlineSnapshot(`
            "framework:
              name: SAPUI5
              version: 1.64.0s
              libraries:
                - name: sap.m
                - name: themelib_sap_belize
            "
        `);
    });

    test('UI5Config addUI5Framework: dark theme lib handling', async () => {
        const ui5Config = await UI5Config.newInstance('');
        ui5Config.addUI5Framework('1.64.0s', ['sap.m'], 'sap_fiori_3_dark');
        expect((await ui5Config).toString()).toMatchInlineSnapshot(`
          "framework:
            name: SAPUI5
            version: 1.64.0s
            libraries:
              - name: sap.m
              - name: themelib_sap_fiori_3
          "
      `);
    });

    /**
     * Consumers may require scaffolded apps that do not yet have a service defined.
     * This test ensures a valid middleware definition is generated without a full service defintion.
     */
    test('getFioriToolsProxyMiddlewareConfig no datasource provided', async () => {
        let serviceData = {};

        expect(getFioriToolsProxyMiddlewareConfig(serviceData)).toMatchInlineSnapshot(`
            Object {
              "comments": Array [
                Object {
                  "comment": " If set to true, certificate errors will be ignored. E.g. self-signed certificates will be accepted",
                  "path": "configuration.ignoreCertError",
                },
                Object {
                  "comment": " The UI5 version, for instance, 1.78.1. null means latest version",
                  "path": "configuration.ui5.version",
                },
              ],
              "config": Array [
                Object {
                  "afterMiddleware": "compression",
                  "configuration": Object {
                    "ignoreCertError": false,
                    "ui5": Object {
                      "path": Array [
                        "/resources",
                        "/test-resources",
                      ],
                      "url": "https://ui5.sap.com",
                      "version": "",
                    },
                  },
                  "name": "fiori-tools-proxy",
                },
              ],
            }
        `);
    });

    test('getFioriToolsProxyMiddlewareConfig no path provided', async () => {
        let serviceData = {
            url: 'http://localhost:8080'
        };

        expect(getFioriToolsProxyMiddlewareConfig(serviceData)).toMatchInlineSnapshot(`
          Object {
            "comments": Array [
              Object {
                "comment": " If set to true, certificate errors will be ignored. E.g. self-signed certificates will be accepted",
                "path": "configuration.ignoreCertError",
              },
              Object {
                "comment": " The UI5 version, for instance, 1.78.1. null means latest version",
                "path": "configuration.ui5.version",
              },
            ],
            "config": Array [
              Object {
                "afterMiddleware": "compression",
                "configuration": Object {
                  "backend": Array [
                    Object {
                      "path": "/",
                      "url": "http://localhost:8080",
                    },
                  ],
                  "ignoreCertError": false,
                  "ui5": Object {
                    "path": Array [
                      "/resources",
                      "/test-resources",
                    ],
                    "url": "https://ui5.sap.com",
                    "version": "",
                  },
                },
                "name": "fiori-tools-proxy",
              },
            ],
          }
      `);
    });
});
