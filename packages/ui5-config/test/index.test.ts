import {
    getMockServerMiddlewareConfig,
    getFioriToolsProxyMiddlewareConfig,
    getAppReloadMiddlewareConfig,
    UI5Config
} from '../src';

describe('Fiori config utils', () => {
    const serviceData = {
        path: '/testpath',
        url: 'http://localhost:8080',
        destination: 'SIDCLNT000'
    };
    beforeAll(() => {});

    test('getMockServerMiddlewareConfig', async () => {
        expect(getMockServerMiddlewareConfig(serviceData.path)).toMatchInlineSnapshot(`
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
            }
        `);
    });

    test('getFioriToolsProxyMiddlewareConfig', async () => {
        expect(getFioriToolsProxyMiddlewareConfig([serviceData], {})).toMatchInlineSnapshot(`
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
              "config": Object {
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
            }
        `);
    });

    test('getAppReloadMiddlewareConfig', async () => {
        expect(getAppReloadMiddlewareConfig()).toMatchInlineSnapshot(`
            Object {
              "afterMiddleware": "compression",
              "configuration": Object {
                "path": "webapp",
                "port": 35729,
              },
              "name": "fiori-tools-appreload",
            }
        `);
    });

    describe('UI5Config', () => {
        test('addUI5Framework', async () => {
            const ui5Config = await UI5Config.newInstance('');
            ui5Config.addUI5Framework('SAPUI5', '1.64.0', ['sap.m'], 'sap_belize');
            expect((await ui5Config).toString()).toMatchInlineSnapshot(`
            "framework:
              name: SAPUI5
              version: 1.64.0
              libraries:
                - name: sap.m
                - name: themelib_sap_belize
            "
        `);
        });

        test('addUI5Framework: dark theme lib handling', async () => {
            const ui5Config = await UI5Config.newInstance('');
            ui5Config.addUI5Framework('SAPUI5', '1.64.0', ['sap.m'], 'sap_fiori_3_dark');
            expect((await ui5Config).toString()).toMatchInlineSnapshot(`
          "framework:
            name: SAPUI5
            version: 1.64.0
            libraries:
              - name: sap.m
              - name: themelib_sap_fiori_3
          "
      `);
        });

        test('addBackendToFioriToolsProxydMiddleware', async () => {
            const ui5Config = await UI5Config.newInstance('');
            ui5Config.addFioriToolsProxydMiddleware({ ui5: {} });
            ui5Config.addBackendToFioriToolsProxydMiddleware(serviceData);
            expect((await ui5Config).toString()).toMatchInlineSnapshot(`
          "server:
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
                    version: ''
                  backend:
                    - path: /testpath
                      url: http://localhost:8080
                      destination: SIDCLNT000
          "
          `);
        });
    });
    /**
     * Consumers may require scaffolded apps that do not yet have a service defined.
     * This test ensures a valid middleware definition is generated without a full service defintion.
     */
    test('getFioriToolsProxyMiddlewareConfig no datasource provided', async () => {
        expect(getFioriToolsProxyMiddlewareConfig(undefined, {})).toMatchInlineSnapshot(`
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
              "config": Object {
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
            }
        `);
    });

    test('getFioriToolsProxyMiddlewareConfig no path provided', async () => {
        let serviceData = {
            url: 'http://localhost:8080'
        };

        expect(getFioriToolsProxyMiddlewareConfig([serviceData])).toMatchInlineSnapshot(`
          Object {
            "comments": Array [
              Object {
                "comment": " If set to true, certificate errors will be ignored. E.g. self-signed certificates will be accepted",
                "path": "configuration.ignoreCertError",
              },
            ],
            "config": Object {
              "afterMiddleware": "compression",
              "configuration": Object {
                "backend": Array [
                  Object {
                    "path": "/",
                    "url": "http://localhost:8080",
                  },
                ],
                "ignoreCertError": false,
              },
              "name": "fiori-tools-proxy",
            },
          }
      `);
    });
});
