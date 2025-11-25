import type { EdmxAnnotationsInfo, OdataService } from '../../src';
import { generate, update, remove, OdataVersion, ServiceType } from '../../src';
import { join } from 'node:path';
import type { Editor } from 'mem-fs-editor';
import { create } from 'mem-fs-editor';
import { create as createStorage } from 'mem-fs';
import { enhanceData } from '../../src/data';
import cloneDeep from 'lodash/cloneDeep';
import { UI5Config } from '@sap-ux/ui5-config';
import { tmpdir } from 'node:os';
import { t } from '../../src/i18n';
import * as projectAccess from '@sap-ux/project-access';

const testDir = tmpdir();
const commonConfig = {
    url: 'http://localhost',
    path: '/sap/odata/testme',
    client: '012',
    metadata: '<HELLO WORLD />',
    type: ServiceType.EDMX
};

describe('generate', () => {
    describe('invalid manifest.json', () => {
        const config: OdataService = {
            ...commonConfig,
            version: OdataVersion.v2
        };
        let fs: Editor;
        beforeEach(async () => {
            fs = create(createStorage());
        });

        it('no manifest.json', async () => {
            await expect(generate(testDir, config, fs)).rejects.toEqual(
                Error(t('error.requiredProjectFileNotFound', { path: 'manifest.json' }))
            );
        });

        it('faulty manifest.json', async () => {
            fs.writeJSON(join(testDir, 'webapp/manifest.json'), {});
            await expect(generate(testDir, config, fs)).rejects.toEqual(
                Error(
                    t('error.requiredProjectPropertyNotFound', {
                        property: `'sap.app'.id`,
                        path: join(testDir, 'webapp/manifest.json')
                    })
                )
            );
        });

        it('service URI already exists', async () => {
            const existingURI = 'dummy/';
            fs.writeJSON(join(testDir, 'webapp/manifest.json'), {
                'sap.app': { id: 'error', dataSources: { existing: { uri: existingURI } } }
            });
            const service = { ...config, path: 'dummy' };
            await expect(generate(testDir, service, fs)).rejects.toEqual(
                Error(
                    t('error.requiredServiceAlreadyExists', {
                        uri: existingURI
                    })
                )
            );
        });
    });

    describe('different folder structures', () => {
        let fs: Editor;
        const root = join(testDir, 'nested');
        const config: OdataService = {
            ...commonConfig,
            version: OdataVersion.v2,
            metadata: '<XML />'
        };

        beforeEach(async () => {
            // generate required files
            fs = create(createStorage());

            fs.writeJSON(join(root, 'webapp/manifest.json'), {
                'sap.app': {
                    id: 'testappid'
                }
            });
        });

        it('No package.json or ui5.yaml - only manifest updates', async () => {
            await generate(root, config, fs);
            const manifest = fs.readJSON(join(root, 'webapp/manifest.json')) as Partial<projectAccess.Manifest>;
            expect(manifest?.['sap.app']?.dataSources?.mainService.uri).toBe(config.path);
        });

        it('No ui5-local.yaml should be generated if service type is cds', async () => {
            const capConfig = {
                ...config,
                type: ServiceType.CDS
            };
            await generate(root, capConfig, fs);
            expect(fs.exists(join(root, 'ui5-local.yaml'))).toBe(false);
        });

        it('No ui5.yaml - only manifest updates', async () => {
            const packagePath = join(root, 'package.json');
            fs.writeJSON(packagePath, {});

            await generate(root, config, fs);
            const manifest = fs.readJSON(join(root, 'webapp/manifest.json')) as Partial<projectAccess.Manifest>;
            expect(manifest?.['sap.app']?.dataSources?.mainService.uri).toBe(config.path);
            expect(fs.readJSON(packagePath)).toEqual({});
        });

        it('Standard folder structure - all files updated', async () => {
            const getWebappPathMock = jest.spyOn(projectAccess, 'getWebappPath');
            const packagePath = join(root, 'package.json');
            fs.writeJSON(packagePath, {});
            const ui5YamlWithOutMiddleware = (await UI5Config.newInstance('')).setConfiguration({}).toString();
            fs.write(join(root, 'ui5.yaml'), ui5YamlWithOutMiddleware);

            await generate(root, config, fs);
            const manifest = fs.readJSON(join(root, 'webapp/manifest.json')) as Partial<projectAccess.Manifest>;
            expect(manifest?.['sap.app']?.dataSources?.mainService.uri).toBe(config.path);
            expect(fs.exists(join(root, 'ui5-mock.yaml'))).toBe(true);
            // verify getWebappPath is called with fs
            expect(getWebappPathMock).toHaveBeenCalledWith(expect.anything(), fs);
        });

        it('Nested folder structure - all files updated', async () => {
            const packagePath = join(root, 'package.json');
            fs.writeJSON(packagePath, {});
            const ui5YamlWithMiddleware = (await UI5Config.newInstance(''))
                .addFioriToolsProxyMiddleware({ ui5: {} })
                .toString();
            fs.write(join(root, 'ui5.yaml'), ui5YamlWithMiddleware);
            await generate(root, config, fs);
            const manifest = fs.readJSON(join(root, 'webapp/manifest.json')) as Partial<projectAccess.Manifest>;
            expect(manifest?.['sap.app']?.dataSources?.mainService.uri).toBe(config.path);
            expect(fs.exists(join(root, 'ui5-mock.yaml'))).toBe(true);
        });

        it('Existing services - files are restructurized and updated', async () => {
            const service = {
                ...config,
                name: 'secondService'
            };
            fs.writeJSON(join(root, 'webapp/manifest.json'), {
                'sap.app': {
                    id: 'testappid',
                    dataSources: {
                        mainService: {
                            type: 'OData',
                            uri: '/sap/opu/odata/sap/SEPMRA_PROD_MAN/',
                            settings: {
                                annotations: ['SEPMRA_PROD_MAN'],
                                localUri: 'localService/metadata.xml'
                            }
                        },
                        SEPMRA_PROD_MAN: {
                            type: 'ODataAnnotation',
                            uri: `/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/Annotations(TechnicalName='SEPMRA_PROD_MAN',Version='0001')/$value/`,
                            settings: {
                                localUri: 'localService/SEPMRA_PROD_MAN.xml'
                            }
                        }
                    }
                }
            });
            const packagePath = join(root, 'package.json');
            fs.writeJSON(packagePath, {});
            const mainServiceRoot = join(root, 'webapp', 'localService');
            fs.write(join(mainServiceRoot, 'metadata.xml'), '');
            fs.write(join(mainServiceRoot, 'SEPMRA_PROD_MAN.xml'), '');
            await generate(root, service, fs);
            const manifest = fs.readJSON(join(root, 'webapp/manifest.json')) as Partial<projectAccess.Manifest>;
            // Check if existing services are restructurized
            expect(manifest?.['sap.app']?.dataSources?.mainService.settings?.localUri).toBe(
                'localService/mainService/metadata.xml'
            );
            expect(manifest?.['sap.app']?.dataSources?.SEPMRA_PROD_MAN?.settings?.localUri).toBe(
                'localService/mainService/SEPMRA_PROD_MAN.xml'
            );
            // No service file in localService
            expect(fs.exists(join(root, 'webapp', 'localService', 'metadata.xml'))).toBe(false);
            expect(fs.exists(join(root, 'webapp', 'localService', 'SEPMRA_PROD_MAN.xml'))).toBe(false);
            // Services files are moved to localService/mainService
            expect(fs.exists(join(root, 'webapp', 'localService', 'mainService', 'metadata.xml'))).toBe(true);
            expect(fs.exists(join(root, 'webapp', 'localService', 'mainService', 'SEPMRA_PROD_MAN.xml'))).toBe(true);
            // Check if new service is added
            expect(manifest?.['sap.app']?.dataSources?.secondService?.settings?.localUri).toBe(
                'localService/secondService/metadata.xml'
            );
            expect(fs.exists(join(root, 'webapp', 'localService', 'secondService', 'metadata.xml'))).toBe(true);
        });
    });

    describe('different valid input', () => {
        let fs: Editor;
        beforeEach(async () => {
            const ui5Yaml = (await UI5Config.newInstance('')).addFioriToolsProxyMiddleware({ ui5: {} }).toString();
            // generate required files
            fs = create(createStorage());
            fs.write(join(testDir, 'ui5.yaml'), ui5Yaml);
            fs.write(join(testDir, 'ui5-local.yaml'), '');
            fs.writeJSON(join(testDir, 'package.json'), { ui5: { dependencies: [] } });
            fs.write(
                join(testDir, 'webapp', 'manifest.json'),
                JSON.stringify({
                    'sap.app': {
                        id: 'testappid'
                    }
                })
            );
        });

        it('Valid OData V2 service', async () => {
            const config = {
                ...commonConfig,
                version: OdataVersion.v2,
                annotations: {
                    technicalName: 'TEST_ME',
                    xml: '<HELLO WORLD />'
                }
            };
            await generate(testDir, config as OdataService, fs);

            // verify updated manifest.json
            const manifest = fs.readJSON(join(testDir, 'webapp', 'manifest.json')) as Partial<projectAccess.Manifest>;
            expect(manifest['sap.app']?.dataSources?.mainService.uri).toBe(config.path);
            expect(manifest['sap.app']?.dataSources?.[config.annotations.technicalName]).toBeDefined();
            // verify local copy of metadata
            expect(fs.read(join(testDir, 'webapp', 'localService', 'mainService', 'metadata.xml'))).toBe(
                config.metadata
            );
            expect(
                fs.read(
                    join(testDir, 'webapp', 'localService', 'mainService', `${config.annotations.technicalName}.xml`)
                )
            ).toBe(config.annotations.xml);
            // verify the updated package.json
            expect(fs.readJSON(join(testDir, 'package.json'))).toStrictEqual({
                devDependencies: {
                    '@sap-ux/ui5-middleware-fe-mockserver': '2',
                    '@sap/ux-ui5-tooling': '1'
                },
                scripts: {
                    'start-mock': `fiori run --config ./ui5-mock.yaml --open \"/\"`
                },
                ui5: {
                    dependencies: ['@sap-ux/ui5-middleware-fe-mockserver', '@sap/ux-ui5-tooling']
                }
            });
        });

        it('Valid OData V2 service, service name exists, generate unique', async () => {
            // Test to verify that service names are generated unique if necessary
            const existingName = 'existing';
            const config = {
                ...commonConfig,
                version: OdataVersion.v2,
                name: existingName
            };
            fs.writeJSON(join(testDir, 'webapp/manifest.json'), {
                'sap.app': {
                    id: 'correct',
                    dataSources: { [existingName]: { type: 'OData' }, mainService: { type: 'OData' } }
                }
            });
            await generate(testDir, config, fs);
            // verify updated manifest.json
            const manifest = fs.readJSON(join(testDir, 'webapp', 'manifest.json')) as Partial<projectAccess.Manifest>;
            expect(manifest?.['sap.app']?.dataSources).toStrictEqual({
                existing: {
                    type: 'OData'
                },
                existing1: {
                    type: 'OData',
                    uri: '/sap/odata/testme/',
                    settings: {
                        annotations: [],
                        localUri: 'localService/existing1/metadata.xml',
                        odataVersion: '2.0'
                    }
                },
                mainService: {
                    type: 'OData'
                }
            });
            expect(fs.exists(join(testDir, 'webapp', 'localService', 'existing1', 'metadata.xml'))).toBe(true);
            // Make sure files for other services are touched/created
            expect(fs.exists(join(testDir, 'webapp', 'localService', 'existing', 'metadata.xml'))).toBe(false);
            expect(fs.exists(join(testDir, 'webapp', 'localService', 'mainService', 'metadata.xml'))).toBe(false);
            // verify the updated package.json
            expect(fs.readJSON(join(testDir, 'package.json'))).toStrictEqual({
                devDependencies: {
                    '@sap-ux/ui5-middleware-fe-mockserver': '2',
                    '@sap/ux-ui5-tooling': '1'
                },
                scripts: {
                    'start-mock': `fiori run --config ./ui5-mock.yaml --open \"/\"`
                },
                ui5: {
                    dependencies: ['@sap-ux/ui5-middleware-fe-mockserver', '@sap/ux-ui5-tooling']
                }
            });
        });

        it('Valid OData V2 service with multiple annotations', async () => {
            const config = {
                ...commonConfig,
                version: OdataVersion.v2,
                annotations: [
                    {
                        technicalName: 'TEST_ME',
                        xml: '<HELLO WORLD />'
                    },
                    {
                        technicalName: 'TEST_ME_TWO',
                        xml: '<HELLO WORLD TWO />'
                    }
                ]
            };
            await generate(testDir, config as OdataService, fs);

            // verify updated manifest.json
            const manifest = fs.readJSON(join(testDir, 'webapp', 'manifest.json')) as Partial<projectAccess.Manifest>;
            expect(manifest?.['sap.app']?.dataSources?.mainService.uri).toBe(config.path);
            expect(manifest?.['sap.app']?.dataSources?.[config.annotations[0].technicalName]).toBeDefined();
            expect(manifest?.['sap.app']?.dataSources?.[config.annotations[1].technicalName]).toBeDefined();
            // verify local copy of metadata
            // mainService should be used in case there is no name defined for service
            expect(fs.read(join(testDir, 'webapp', 'localService', 'mainService', 'metadata.xml'))).toBe(
                config.metadata
            );
            expect(
                fs.read(
                    join(testDir, 'webapp', 'localService', 'mainService', `${config.annotations[0].technicalName}.xml`)
                )
            ).toBe(config.annotations[0].xml);
            expect(
                fs.read(
                    join(testDir, 'webapp', 'localService', 'mainService', `${config.annotations[1].technicalName}.xml`)
                )
            ).toBe(config.annotations[1].xml);
            // verify the updated package.json
            expect(fs.readJSON(join(testDir, 'package.json'))).toStrictEqual({
                devDependencies: {
                    '@sap-ux/ui5-middleware-fe-mockserver': '2',
                    '@sap/ux-ui5-tooling': '1'
                },
                scripts: {
                    'start-mock': `fiori run --config ./ui5-mock.yaml --open \"/\"`
                },
                ui5: {
                    dependencies: ['@sap-ux/ui5-middleware-fe-mockserver', '@sap/ux-ui5-tooling']
                }
            });
        });

        it('Valid OData V4 service', async () => {
            const config = {
                ...commonConfig,
                version: OdataVersion.v4,
                name: 'myService'
            };
            await generate(testDir, config as OdataService, fs);

            // verify updated manifest.json
            const manifest = fs.readJSON(join(testDir, 'webapp', 'manifest.json')) as Partial<projectAccess.Manifest>;
            expect(manifest?.['sap.app']?.dataSources?.[config.name].uri).toBe(config.path);
            // verify local copy of metadata
            // first service is always mainService, so we make sure data for it is generated in correct location
            expect(fs.exists(join(testDir, 'webapp', 'localService', 'myService', 'metadata.xml'))).toBe(false);
            expect(fs.exists(join(testDir, 'webapp', 'localService', 'mainService', 'metadata.xml'))).toBe(true);
            expect(fs.read(join(testDir, 'webapp', 'localService', 'mainService', 'metadata.xml'))).toBe(
                config.metadata
            );
            // verify that no destination is added to the ui5.yaml
            expect(fs.read(join(testDir, 'ui5.yaml'))).not.toContain('destination: ');
            // verify that client is set
            expect(fs.read(join(testDir, 'ui5.yaml'))).toContain('client: ');
            // verify the updated package.json
            expect(fs.readJSON(join(testDir, 'package.json'))).toStrictEqual({
                devDependencies: {
                    '@sap-ux/ui5-middleware-fe-mockserver': '2',
                    '@sap/ux-ui5-tooling': '1'
                },
                scripts: {
                    'start-mock': `fiori run --config ./ui5-mock.yaml --open \"/\"`
                },
                ui5: {
                    dependencies: ['@sap-ux/ui5-middleware-fe-mockserver', '@sap/ux-ui5-tooling']
                }
            });
        });

        it('Valid OData service with destination and no optional parameters', async () => {
            const config = {
                url: commonConfig.url,
                path: commonConfig.path + '/',
                version: OdataVersion.v4,
                destination: {
                    name: 'test'
                },
                client: '099'
            };
            // no localService folder needed
            await generate(testDir, config as OdataService, fs);

            // verify updated manifest.json
            const manifest = fs.readJSON(join(testDir, 'webapp', 'manifest.json')) as Partial<projectAccess.Manifest>;
            expect(manifest?.['sap.app']?.dataSources?.mainService.uri).toBe(config.path);
            // verify that the destination is added to the ui5.yaml
            expect(fs.read(join(testDir, 'ui5.yaml'))).toContain(`destination: ${config.destination.name}`);
            // verify that client is set
            expect(fs.read(join(testDir, 'ui5.yaml'))).toContain('client: ');
            // verify that no localService folder has been created
            expect(fs.exists(join(testDir, 'webapp', 'localService', 'metadata.xml'))).toBeFalsy();
            // verify the updated package.json
            expect(fs.readJSON(join(testDir, 'package.json'))).toStrictEqual({
                devDependencies: {
                    '@sap/ux-ui5-tooling': '1'
                },
                ui5: {
                    dependencies: ['@sap/ux-ui5-tooling']
                }
            });
        });

        it('Valid OData service with additional optional preview settings', async () => {
            const config: OdataService = {
                url: commonConfig.url,
                path: commonConfig.path + '/',
                version: OdataVersion.v4,
                destination: {
                    name: 'test'
                },
                client: '013',
                previewSettings: {
                    apiHub: true,
                    scp: false,
                    pathPrefix: '/~prefix'
                },
                ignoreCertError: true
            };

            await generate(testDir, config as OdataService, fs);

            // verify tha the optional properties are being added
            expect(fs.read(join(testDir, 'ui5.yaml'))).toMatchInlineSnapshot(`
                "server:
                  customMiddleware:
                    - name: fiori-tools-proxy
                      afterMiddleware: compression
                      configuration:
                        ignoreCertErrors: true # If set to true, certificate errors will be ignored. E.g. self-signed certificates will be accepted
                        ui5:
                          path:
                            - /resources
                            - /test-resources
                          url: https://ui5.sap.com
                        backend:
                          - apiHub: true
                            scp: false
                            pathPrefix: /~prefix
                            path: /sap
                            url: http://localhost
                            client: '013'
                            destination: test
                "
            `);
            // verify the updated package.json
            expect(fs.readJSON(join(testDir, 'package.json'))).toStrictEqual({
                devDependencies: {
                    '@sap/ux-ui5-tooling': '1'
                },
                ui5: {
                    dependencies: ['@sap/ux-ui5-tooling']
                }
            });
        });

        it('Valid service with neither metadata nor annotations and not starting with /sap', async () => {
            const config = {
                url: 'https://services.odata.org',
                path: '/V2/Northwind/Northwind.svc',
                version: OdataVersion.v2
            };
            // no localService folder needed

            await generate(testDir, config as OdataService, fs);

            // verify updated manifest.json
            const manifest = fs.readJSON(join(testDir, 'webapp', 'manifest.json')) as Partial<projectAccess.Manifest>;
            expect(manifest?.['sap.app']?.dataSources?.mainService?.settings?.annotations).toStrictEqual([]);
            // verify that the path is correct in ui5.yaml
            expect(fs.read(join(testDir, 'ui5.yaml'))).toContain('path: /V2');
            // verify the updated package.json
            expect(fs.readJSON(join(testDir, 'package.json'))).toStrictEqual({
                devDependencies: {
                    '@sap/ux-ui5-tooling': '1'
                },
                ui5: {
                    dependencies: ['@sap/ux-ui5-tooling']
                }
            });
        });

        describe('Enhance unspecified input data with defaults', () => {
            const config = {
                url: 'https://services.odata.org',
                path: '/V2/Northwind/Northwind.svc',
                version: OdataVersion.v2
            } as OdataService;
            test('No services are defined - mainService used for service name and "" for service model', async () => {
                const configCopy = cloneDeep(config);
                await enhanceData('', configCopy, fs);
                expect(configCopy).toMatchInlineSnapshot(`
                    Object {
                      "model": "",
                      "name": "mainService",
                      "path": "/V2/Northwind/Northwind.svc/",
                      "previewSettings": Object {
                        "path": "/V2",
                        "url": "https://services.odata.org",
                      },
                      "type": "edmx",
                      "url": "https://services.odata.org",
                      "version": "2",
                    }
                `);
            });
            test('Services already defined - actual service name and service model are used', async () => {
                const configCopy = cloneDeep(Object.assign({}, config, { model: 'modelName', name: 'datasourceName' }));
                fs.writeJSON(join('webapp', 'manifest.json'), {
                    'sap.app': { dataSources: { existingService: { type: 'OData' } } },
                    'sap.ui5': { models: { existingModel: { dataSource: 'existingService' } } }
                });
                await enhanceData('', configCopy, fs);
                expect(configCopy).toMatchInlineSnapshot(`
                    Object {
                      "model": "modelName",
                      "name": "datasourceName",
                      "path": "/V2/Northwind/Northwind.svc/",
                      "previewSettings": Object {
                        "path": "/V2",
                        "url": "https://services.odata.org",
                      },
                      "type": "edmx",
                      "url": "https://services.odata.org",
                      "version": "2",
                    }
                `);
                fs.delete(join('webapp', 'manifest.json'));
            });
            test('Undefined path does not throw but sets valid path', async () => {
                const configCopy = cloneDeep(Object.assign({}, config, { path: undefined }));
                await enhanceData('', configCopy, fs);
                expect(configCopy).toMatchInlineSnapshot(`
                    Object {
                      "model": "",
                      "name": "mainService",
                      "path": "/",
                      "previewSettings": Object {
                        "path": "/",
                        "url": "https://services.odata.org",
                      },
                      "type": "edmx",
                      "url": "https://services.odata.org",
                      "version": "2",
                    }
                `);
            });
            test('/sap path is not used for preview settings', async () => {
                const ui5Yaml = (await UI5Config.newInstance(''))
                    .addFioriToolsProxyMiddleware({ ui5: {}, backend: [{ path: '/sap', url: 'https://localhost' }] })
                    .toString();
                fs.write(ui5Yaml, join('', 'ui5.yaml'));
                // "/sap" entry already exists, it should not be used
                const configCopy = cloneDeep(Object.assign({}, config, { path: '/sap/test/path/' }));
                await enhanceData('', configCopy, fs);
                expect(configCopy).toMatchInlineSnapshot(`
                    Object {
                      "model": "",
                      "name": "mainService",
                      "path": "/sap/test/path/",
                      "previewSettings": Object {
                        "path": "/sap",
                        "url": "https://services.odata.org",
                      },
                      "type": "edmx",
                      "url": "https://services.odata.org",
                      "version": "2",
                    }
                `);
                fs.delete(join('', 'ui5.yaml'));
            });
            test('Service and annotation names are the same', async () => {
                fs.writeJSON(join('webapp', 'manifest.json'), {
                    'sap.app': { dataSources: { exisitingSerivce: { type: 'OData' } } }
                });
                const configCopy = cloneDeep(
                    Object.assign({}, config, { name: 'aname', annotations: { name: 'aname' } })
                );
                await enhanceData('', configCopy, fs);
                expect(configCopy).toMatchInlineSnapshot(`
                    Object {
                      "annotations": Object {
                        "name": "aname_Annotation",
                      },
                      "model": "",
                      "name": "aname",
                      "path": "/V2/Northwind/Northwind.svc/",
                      "previewSettings": Object {
                        "path": "/V2",
                        "url": "https://services.odata.org",
                      },
                      "type": "edmx",
                      "url": "https://services.odata.org",
                      "version": "2",
                    }
                `);
                fs.delete(join('webapp', 'manifest.json'));
            });
            test('mainService is being updated, "" should be used for model', async () => {
                // mainService model already exists
                fs.writeJSON(join('webapp', 'manifest.json'), {
                    'sap.app': { dataSources: { mainService: { type: 'OData' } } },
                    'sap.ui5': { models: { '': { dataSource: 'mainService' } } }
                });
                const configCopy = cloneDeep(Object.assign({}, config, { name: 'mainService' }));
                await enhanceData('', configCopy, fs, true);
                expect(configCopy).toMatchInlineSnapshot(`
                    Object {
                      "model": "",
                      "name": "mainService",
                      "path": "/V2/Northwind/Northwind.svc",
                      "previewSettings": Object {
                        "path": "/V2",
                        "url": "https://services.odata.org",
                      },
                      "type": "edmx",
                      "url": "https://services.odata.org",
                      "version": "2",
                    }
                `);
                fs.delete(join('webapp', 'manifest.json'));
            });
            test('model called differentService is being added, "differentService" should be used for model', async () => {
                // mainService model already exists
                fs.writeJSON(join('webapp', 'manifest.json'), {
                    'sap.app': { dataSources: { mainService: { type: 'OData' } } },
                    'sap.ui5': { models: { '': { dataSource: 'mainService' } } }
                });
                const configCopy = cloneDeep(Object.assign({}, config, { model: 'differentService' }));
                await enhanceData('', configCopy, fs);
                expect(configCopy).toMatchInlineSnapshot(`
                    Object {
                      "model": "differentService",
                      "path": "/V2/Northwind/Northwind.svc/",
                      "previewSettings": Object {
                        "path": "/V2",
                        "url": "https://services.odata.org",
                      },
                      "type": "edmx",
                      "url": "https://services.odata.org",
                      "version": "2",
                    }
                `);
                fs.delete(join('webapp', 'manifest.json'));
            });
        });
    });
});

describe('remove', () => {
    let fs: Editor;
    beforeEach(async () => {
        fs = await getSingleServiceMock();
    });
    it('Try to remove an unexisting service', async () => {
        await remove(
            testDir,
            {
                name: 'dummyService',
                url: 'https://dummyUrl',
                path: '/dummyPath',
                type: ServiceType.EDMX,
                annotations: [{ technicalName: 'dummy-technical-name' }] as EdmxAnnotationsInfo[],
                version: OdataVersion.v4
            },
            fs
        );
        // verify updated manifest.json
        const manifest = fs.readJSON(join(testDir, 'webapp', 'manifest.json')) as Partial<projectAccess.Manifest>;
        expect(manifest?.['sap.app']?.dataSources).toStrictEqual({
            mainService: {
                uri: '/sap',
                type: 'OData',
                settings: {
                    annotations: ['SEPMRA_PROD_MAN', 'annotation'],
                    localUri: 'localService/mainService/metadata.xml'
                }
            },
            SEPMRA_PROD_MAN: {
                uri: `/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/Annotations(TechnicalName='SEPMRA_PROD_MAN',Version='0001')/$value/`,
                type: 'ODataAnnotation',
                settings: {
                    localUri: 'localService/mainService/SEPMRA_PROD_MAN.xml'
                }
            },
            annotation: {
                type: 'ODataAnnotation',
                uri: 'annotations/annotation.xml',
                settings: {
                    localUri: 'annotations/annotation.xml'
                }
            }
        });
        expect(manifest?.['sap.ui5']?.models).toStrictEqual({
            '': {
                dataSource: 'mainService'
            }
        });
        // verify ui5.yaml, ui5-local.yaml, ui5-mock.yaml
        expect(fs.read(join(testDir, 'ui5.yaml'))).toContain(
            'backend:\n          - path: /sap\n            url: https://localhost\n'
        );
        expect(fs.read(join(testDir, 'ui5-local.yaml'))).toContain(
            'backend:\n          - path: /sap\n            url: https://localhost\n'
        );
        expect(fs.read(join(testDir, 'ui5-mock.yaml'))).toContain('services:\n          - urlPath: /sap\n');
        expect(fs.read(join(testDir, 'ui5-mock.yaml'))).toContain(
            `annotations:\n          - urlPath: /sap/opu/odata/IWFND/CATALOGSERVICE;v=2/Annotations(TechnicalName='SEPMRA_PROD_MAN',Version='0001')/$value/\n`
        );
        expect(fs.exists(join(testDir, 'webapp', 'annotations', 'annotation.xml'))).toBe(true);
        expect(fs.exists(join(testDir, 'webapp', 'localService', 'mainService', 'SEPMRA_PROD_MAN.xml'))).toBe(true);
        expect(fs.exists(join(testDir, 'webapp', 'localService', 'mainService', 'metadata.xml'))).toBe(true);
    });
    it('Remove an existing service', async () => {
        await remove(
            testDir,
            {
                name: 'mainService',
                url: 'https://localhost',
                path: '/sap',
                type: ServiceType.EDMX,
                annotations: [
                    {
                        technicalName: 'SEPMRA_PROD_MAN',
                        xml: '<edmx:Edmx><?xml version="1.0" encoding="utf-8"?></edmx:Edmx>'
                    }
                ] as EdmxAnnotationsInfo[],
                version: OdataVersion.v4
            },
            fs
        );
        // verify updated manifest.json
        const manifest = fs.readJSON(join(testDir, 'webapp', 'manifest.json')) as Partial<projectAccess.Manifest>;
        expect(manifest?.['sap.app']?.dataSources).toStrictEqual({
            annotation: {
                type: 'ODataAnnotation',
                uri: 'annotations/annotation.xml',
                settings: {
                    localUri: 'annotations/annotation.xml'
                }
            }
        });
        expect(manifest?.['sap.ui5']?.models).toStrictEqual({});
        // verify ui5.yaml, ui5-local.yaml, ui5-mock.yaml
        expect(fs.read(join(testDir, 'ui5.yaml'))).not.toContain('- path: /sap\n            url: http://localhost\n');
        expect(fs.read(join(testDir, 'ui5-local.yaml'))).not.toContain(
            '- path: /sap\n            url: http://localhost\n'
        );
        expect(fs.read(join(testDir, 'ui5-mock.yaml'))).not.toContain(
            'services:\n          - urlPath: /sap/odata/testme\n '
        );
        expect(fs.read(join(testDir, 'ui5-mock.yaml'))).not.toContain(
            `annotations:\n          - urlPath: /sap/opu/odata/IWFND/CATALOGSERVICE;v=2/Annotations(TechnicalName='SEPMRA_PROD_MAN',Version='0001')/$value/\n`
        );
        // Local annotations should not be deleted
        expect(fs.exists(join(testDir, 'webapp', 'annotations', 'annotation.xml'))).toBe(true);
        expect(fs.exists(join(testDir, 'webapp', 'localService', 'mainService', 'SEPMRA_PROD_MAN.xml'))).toBe(false);
        expect(fs.exists(join(testDir, 'webapp', 'localService', 'mainService', 'metadata.xml'))).toBe(false);
    });
});

describe('update', () => {
    let fs: Editor;
    beforeEach(async () => {
        fs = await getSingleServiceMock();
    });
    it('Try to update an unexisting service', async () => {
        await expect(
            update(
                testDir,
                {
                    name: 'dummyService',
                    url: 'https://dummyUrl',
                    path: '/dummyPath',
                    type: ServiceType.EDMX,
                    annotations: [{ technicalName: 'dummy-technical-name' }] as EdmxAnnotationsInfo[],
                    version: OdataVersion.v4
                },
                fs
            )
        ).rejects.toEqual(
            Error(
                t('error.requiredProjectPropertyNotFound', {
                    property: `'sap.app.dataSources.dummyService'`,
                    path: join(testDir, 'webapp', 'manifest.json')
                })
            )
        );
        // No changes in package.json expected
        expect(fs.readJSON(join(testDir, 'package.json'))).toStrictEqual({
            ui5: {
                dependencies: []
            }
        });
        // No removed annotation files expected
        expect(fs.exists(join(testDir, 'webapp', 'annotations', 'annotation.xml'))).toBe(true);
        expect(fs.exists(join(testDir, 'webapp', 'localService', 'mainService', 'SEPMRA_PROD_MAN.xml'))).toBe(true);
        expect(fs.exists(join(testDir, 'webapp', 'localService', 'mainService', 'metadata.xml'))).toBe(true);
    });
    it('Update an existing service without changes', async () => {
        await update(
            testDir,
            {
                name: 'mainService',
                url: 'https://localhost',
                path: '/sap',
                type: ServiceType.EDMX,
                annotations: [
                    {
                        technicalName: 'SEPMRA_PROD_MAN',
                        xml: '<edmx:Edmx><?xml version="1.0" encoding="utf-8"?></edmx:Edmx>'
                    }
                ] as EdmxAnnotationsInfo[],
                metadata: '<edmx:Edmx><?xml version="1.0" encoding="utf-8"?></edmx:Edmx>',
                version: OdataVersion.v4,
                localAnnotationsName: 'annotation'
            },
            fs
        );
        // verify updated manifest.json
        const manifest = fs.readJSON(join(testDir, 'webapp', 'manifest.json')) as Partial<projectAccess.Manifest>;
        expect(manifest?.['sap.app']?.dataSources).toStrictEqual({
            mainService: {
                uri: '/sap',
                type: 'OData',
                settings: {
                    annotations: ['SEPMRA_PROD_MAN', 'annotation'],
                    localUri: 'localService/mainService/metadata.xml',
                    odataVersion: '4.0'
                }
            },
            SEPMRA_PROD_MAN: {
                uri: `/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/Annotations(TechnicalName='SEPMRA_PROD_MAN',Version='0001')/$value/`,
                type: 'ODataAnnotation',
                settings: {
                    localUri: 'localService/mainService/SEPMRA_PROD_MAN.xml'
                }
            },
            annotation: {
                type: 'ODataAnnotation',
                uri: 'annotations/annotation.xml',
                settings: {
                    localUri: 'annotations/annotation.xml'
                }
            }
        });
        expect(manifest?.['sap.ui5']?.models).toStrictEqual({
            '': {
                dataSource: 'mainService',
                preload: true,
                settings: {
                    autoExpandSelect: true,
                    earlyRequests: true,
                    operationMode: 'Server'
                }
            }
        });
        // verify ui5.yaml, ui5-local.yaml, ui5-mock.yaml
        expect(fs.read(join(testDir, 'ui5.yaml'))).toMatchInlineSnapshot(`
            "server:
              customMiddleware:
                - name: fiori-tools-proxy
                  afterMiddleware: compression
                  configuration:
                    ignoreCertErrors: false # If set to true, certificate errors will be ignored. E.g. self-signed certificates will be accepted
                    backend:
                      - path: /sap
                        url: https://localhost
                    ui5:
                      path:
                        - /resources
                        - /test-resources
                      url: https://ui5.sap.com
            "
        `);
        expect(fs.read(join(testDir, 'ui5-local.yaml'))).toMatchInlineSnapshot(`
            "server:
              customMiddleware:
                - name: fiori-tools-proxy
                  afterMiddleware: compression
                  configuration:
                    ignoreCertErrors: false # If set to true, certificate errors will be ignored. E.g. self-signed certificates will be accepted
                    backend:
                      - path: /sap
                        url: https://localhost
                    ui5:
                      path:
                        - /resources
                        - /test-resources
                      url: https://ui5.sap.com
                - name: sap-fe-mockserver
                  beforeMiddleware: csp
                  configuration:
                    mountPath: /
                    services:
                      - urlPath: /sap
                        metadataPath: ./webapp/localService/mainService/metadata.xml
                        mockdataPath: ./webapp/localService/mainService/data
                        generateMockData: true
                    annotations:
                      - localPath: ./webapp/localService/mainService/SEPMRA_PROD_MAN.xml
                        urlPath: /sap/opu/odata/IWFND/CATALOGSERVICE;v=2/Annotations(TechnicalName='SEPMRA_PROD_MAN',Version='0001')/$value/
            "
        `);
        expect(fs.read(join(testDir, 'ui5-mock.yaml'))).toMatchInlineSnapshot(`
            "server:
              customMiddleware:
                - name: fiori-tools-proxy
                  afterMiddleware: compression
                  configuration:
                    ignoreCertErrors: false # If set to true, certificate errors will be ignored. E.g. self-signed certificates will be accepted
                    backend:
                      - path: /sap
                        url: https://localhost
                    ui5:
                      path:
                        - /resources
                        - /test-resources
                      url: https://ui5.sap.com
                - name: sap-fe-mockserver
                  beforeMiddleware: csp
                  configuration:
                    mountPath: /
                    services:
                      - urlPath: /sap
                        metadataPath: ./webapp/localService/mainService/metadata.xml
                        mockdataPath: ./webapp/localService/mainService/data
                        generateMockData: true
                    annotations:
                      - localPath: ./webapp/localService/mainService/SEPMRA_PROD_MAN.xml
                        urlPath: /sap/opu/odata/IWFND/CATALOGSERVICE;v=2/Annotations(TechnicalName='SEPMRA_PROD_MAN',Version='0001')/$value/
            "
        `);
        // No changes in package.json expected
        expect(fs.readJSON(join(testDir, 'package.json'))).toStrictEqual({
            ui5: {
                dependencies: []
            }
        });
        // No removed annotation files expected
        expect(fs.exists(join(testDir, 'webapp', 'annotations', 'annotation.xml'))).toBe(true);
        expect(fs.exists(join(testDir, 'webapp', 'localService', 'mainService', 'SEPMRA_PROD_MAN.xml'))).toBe(true);
        expect(fs.exists(join(testDir, 'webapp', 'localService', 'mainService', 'metadata.xml'))).toBe(true);
    });

    it('Update an existing service with backend changes', async () => {
        await update(
            testDir,
            {
                name: 'mainService',
                url: 'https://localhost/updated', // Changed URL
                path: '/sap', // Backends are matched by path, use existing path
                type: ServiceType.EDMX,
                annotations: [
                    {
                        technicalName: 'SEPMRA_PROD_MAN',
                        xml: '<edmx:Edmx><?xml version="1.0" encoding="utf-8"?></edmx:Edmx>'
                    }
                ] as EdmxAnnotationsInfo[],
                metadata: '<edmx:Edmx><?xml version="1.0" encoding="utf-8"?></edmx:Edmx>',
                version: OdataVersion.v4,
                localAnnotationsName: 'annotation'
            },
            fs
        );
        // verify updated manifest.json
        const manifest = fs.readJSON(join(testDir, 'webapp', 'manifest.json')) as Partial<projectAccess.Manifest>;
        expect(manifest?.['sap.app']?.dataSources).toStrictEqual({
            mainService: {
                uri: '/sap',
                type: 'OData',
                settings: {
                    annotations: ['SEPMRA_PROD_MAN', 'annotation'],
                    localUri: 'localService/mainService/metadata.xml',
                    odataVersion: '4.0'
                }
            },
            SEPMRA_PROD_MAN: {
                uri: `/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/Annotations(TechnicalName='SEPMRA_PROD_MAN',Version='0001')/$value/`,
                type: 'ODataAnnotation',
                settings: {
                    localUri: 'localService/mainService/SEPMRA_PROD_MAN.xml'
                }
            },
            annotation: {
                type: 'ODataAnnotation',
                uri: 'annotations/annotation.xml',
                settings: {
                    localUri: 'annotations/annotation.xml'
                }
            }
        });
        expect(manifest?.['sap.ui5']?.models).toStrictEqual({
            '': {
                dataSource: 'mainService',
                preload: true,
                settings: {
                    autoExpandSelect: true,
                    earlyRequests: true,
                    operationMode: 'Server'
                }
            }
        });
        // verify ui5.yaml, ui5-local.yaml, ui5-mock.yaml
        expect(fs.read(join(testDir, 'ui5.yaml'))).toMatchInlineSnapshot(`
            "server:
              customMiddleware:
                - name: fiori-tools-proxy
                  afterMiddleware: compression
                  configuration:
                    ignoreCertErrors: false # If set to true, certificate errors will be ignored. E.g. self-signed certificates will be accepted
                    backend:
                      - path: /sap
                        url: https://localhost/updated
                    ui5:
                      path:
                        - /resources
                        - /test-resources
                      url: https://ui5.sap.com
            "
        `);
        expect(fs.read(join(testDir, 'ui5-local.yaml'))).toMatchInlineSnapshot(`
            "server:
              customMiddleware:
                - name: fiori-tools-proxy
                  afterMiddleware: compression
                  configuration:
                    ignoreCertErrors: false # If set to true, certificate errors will be ignored. E.g. self-signed certificates will be accepted
                    backend:
                      - path: /sap
                        url: https://localhost/updated
                    ui5:
                      path:
                        - /resources
                        - /test-resources
                      url: https://ui5.sap.com
                - name: sap-fe-mockserver
                  beforeMiddleware: csp
                  configuration:
                    mountPath: /
                    services:
                      - urlPath: /sap
                        metadataPath: ./webapp/localService/mainService/metadata.xml
                        mockdataPath: ./webapp/localService/mainService/data
                        generateMockData: true
                    annotations:
                      - localPath: ./webapp/localService/mainService/SEPMRA_PROD_MAN.xml
                        urlPath: /sap/opu/odata/IWFND/CATALOGSERVICE;v=2/Annotations(TechnicalName='SEPMRA_PROD_MAN',Version='0001')/$value/
            "
        `);
        expect(fs.read(join(testDir, 'ui5-mock.yaml'))).toMatchInlineSnapshot(`
            "server:
              customMiddleware:
                - name: fiori-tools-proxy
                  afterMiddleware: compression
                  configuration:
                    ignoreCertErrors: false # If set to true, certificate errors will be ignored. E.g. self-signed certificates will be accepted
                    backend:
                      - path: /sap
                        url: https://localhost/updated
                    ui5:
                      path:
                        - /resources
                        - /test-resources
                      url: https://ui5.sap.com
                - name: sap-fe-mockserver
                  beforeMiddleware: csp
                  configuration:
                    mountPath: /
                    services:
                      - urlPath: /sap
                        metadataPath: ./webapp/localService/mainService/metadata.xml
                        mockdataPath: ./webapp/localService/mainService/data
                        generateMockData: true
                    annotations:
                      - localPath: ./webapp/localService/mainService/SEPMRA_PROD_MAN.xml
                        urlPath: /sap/opu/odata/IWFND/CATALOGSERVICE;v=2/Annotations(TechnicalName='SEPMRA_PROD_MAN',Version='0001')/$value/
            "
        `);
        // No changes in package.json expected
        expect(fs.readJSON(join(testDir, 'package.json'))).toStrictEqual({
            ui5: {
                dependencies: []
            }
        });
        // No removed annotation files expected
        expect(fs.exists(join(testDir, 'webapp', 'annotations', 'annotation.xml'))).toBe(true);
        expect(fs.exists(join(testDir, 'webapp', 'localService', 'mainService', 'SEPMRA_PROD_MAN.xml'))).toBe(true);
        expect(fs.exists(join(testDir, 'webapp', 'localService', 'mainService', 'metadata.xml'))).toBe(true);
    });
    it('Update an existing service with new value list references', async () => {
        await update(
            testDir,
            {
                name: 'mainService',
                url: 'https://localhost/updated', // Changed URL
                path: '/sap', // Backends are matched by path, use existing path
                type: ServiceType.EDMX,
                annotations: [
                    {
                        technicalName: 'SEPMRA_PROD_MAN',
                        xml: '<edmx:Edmx><?xml version="1.0" encoding="utf-8"?></edmx:Edmx>'
                    }
                ] as EdmxAnnotationsInfo[],
                metadata: '<edmx:Edmx><?xml version="1.0" encoding="utf-8"?></edmx:Edmx>',
                version: OdataVersion.v4,
                localAnnotationsName: 'annotation',
                externalServices: [
                    {
                        type: 'value-list',
                        metadata: 'ValueListReferences',
                        path: '/sap/my_service',
                        target: 'MyEntity/MyProperty'
                    },
                    {
                        type: 'code-list',
                        metadata: 'CodeListReferences',
                        path: '/sap/my_service2',
                        collectionPath: 'Currencies'
                    }
                ]
            },
            fs
        );
        expect(fs.read(join(testDir, 'ui5-mock.yaml'))).toMatchInlineSnapshot(`
            "server:
              customMiddleware:
                - name: fiori-tools-proxy
                  afterMiddleware: compression
                  configuration:
                    ignoreCertErrors: false # If set to true, certificate errors will be ignored. E.g. self-signed certificates will be accepted
                    backend:
                      - path: /sap
                        url: https://localhost/updated
                    ui5:
                      path:
                        - /resources
                        - /test-resources
                      url: https://ui5.sap.com
                - name: sap-fe-mockserver
                  beforeMiddleware: csp
                  configuration:
                    mountPath: /
                    services:
                      - urlPath: /sap
                        metadataPath: ./webapp/localService/mainService/metadata.xml
                        mockdataPath: ./webapp/localService/mainService/data
                        generateMockData: true
                        resolveExternalServiceReferences: true
                    annotations:
                      - localPath: ./webapp/localService/mainService/SEPMRA_PROD_MAN.xml
                        urlPath: /sap/opu/odata/IWFND/CATALOGSERVICE;v=2/Annotations(TechnicalName='SEPMRA_PROD_MAN',Version='0001')/$value/
            "
        `);
        // Value List references are saved
        expect(
            fs.read(
                join(
                    testDir,
                    'webapp',
                    'localService',
                    'mainService',
                    'my_service',
                    'MyEntity',
                    'MyProperty',
                    'metadata.xml'
                )
            )
        ).toBe('ValueListReferences');
    });

    it('Update an existing service without backend changes', async () => {
        await update(
            testDir,
            {
                name: 'mainService',
                url: 'https://localhost/updated', // Changed URL
                path: '/sap', // Backends are matched by path, use existing path
                type: ServiceType.EDMX,
                annotations: [
                    {
                        technicalName: 'SEPMRA_PROD_MAN',
                        xml: '<edmx:Edmx><?xml version="1.0" encoding="utf-8"?></edmx:Edmx>'
                    }
                ] as EdmxAnnotationsInfo[],
                metadata: '<edmx:Edmx><?xml version="1.0" encoding="utf-8"?></edmx:Edmx>',
                version: OdataVersion.v4,
                localAnnotationsName: 'annotation'
            },
            fs,
            false
        );
        // verify updated manifest.json
        const manifest = fs.readJSON(join(testDir, 'webapp', 'manifest.json')) as Partial<projectAccess.Manifest>;
        expect(manifest?.['sap.app']?.dataSources).toStrictEqual({
            mainService: {
                uri: '/sap',
                type: 'OData',
                settings: {
                    annotations: ['SEPMRA_PROD_MAN', 'annotation'],
                    localUri: 'localService/mainService/metadata.xml',
                    odataVersion: '4.0'
                }
            },
            SEPMRA_PROD_MAN: {
                uri: `/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/Annotations(TechnicalName='SEPMRA_PROD_MAN',Version='0001')/$value/`,
                type: 'ODataAnnotation',
                settings: {
                    localUri: 'localService/mainService/SEPMRA_PROD_MAN.xml'
                }
            },
            annotation: {
                type: 'ODataAnnotation',
                uri: 'annotations/annotation.xml',
                settings: {
                    localUri: 'annotations/annotation.xml'
                }
            }
        });
        expect(manifest?.['sap.ui5']?.models).toStrictEqual({
            '': {
                dataSource: 'mainService',
                preload: true,
                settings: {
                    autoExpandSelect: true,
                    earlyRequests: true,
                    operationMode: 'Server'
                }
            }
        });
        // verify ui5.yaml, ui5-local.yaml, ui5-mock.yaml
        expect(fs.read(join(testDir, 'ui5.yaml'))).toMatchInlineSnapshot(`
            "server:
              customMiddleware:
                - name: fiori-tools-proxy
                  afterMiddleware: compression
                  configuration:
                    ignoreCertErrors: false # If set to true, certificate errors will be ignored. E.g. self-signed certificates will be accepted
                    backend:
                      - path: /sap
                        url: https://localhost
                    ui5:
                      path:
                        - /resources
                        - /test-resources
                      url: https://ui5.sap.com
            "
        `);
        // See backend url are not changed
        expect(fs.read(join(testDir, 'ui5-local.yaml'))).toMatchInlineSnapshot(`
            "server:
              customMiddleware:
                - name: fiori-tools-proxy
                  afterMiddleware: compression
                  configuration:
                    ignoreCertErrors: false # If set to true, certificate errors will be ignored. E.g. self-signed certificates will be accepted
                    backend:
                      - path: /sap
                        url: https://localhost
                    ui5:
                      path:
                        - /resources
                        - /test-resources
                      url: https://ui5.sap.com
                - name: sap-fe-mockserver
                  beforeMiddleware: csp
                  configuration:
                    mountPath: /
                    services:
                      - urlPath: /sap
                        metadataPath: ./webapp/localService/mainService/metadata.xml
                        mockdataPath: ./webapp/localService/mainService/data
                        generateMockData: true
                    annotations:
                      - urlPath: /sap/opu/odata/IWFND/CATALOGSERVICE;v=2/Annotations(TechnicalName='SEPMRA_PROD_MAN',Version='0001')/$value/
            "
        `);
        expect(fs.read(join(testDir, 'ui5-mock.yaml'))).toMatchInlineSnapshot(`
            "server:
              customMiddleware:
                - name: fiori-tools-proxy
                  afterMiddleware: compression
                  configuration:
                    ignoreCertErrors: false # If set to true, certificate errors will be ignored. E.g. self-signed certificates will be accepted
                    backend:
                      - path: /sap
                        url: https://localhost
                    ui5:
                      path:
                        - /resources
                        - /test-resources
                      url: https://ui5.sap.com
                - name: sap-fe-mockserver
                  beforeMiddleware: csp
                  configuration:
                    mountPath: /
                    services:
                      - urlPath: /sap
                        metadataPath: ./webapp/localService/mainService/metadata.xml
                        mockdataPath: ./webapp/localService/mainService/data
                        generateMockData: true
                    annotations:
                      - urlPath: /sap/opu/odata/IWFND/CATALOGSERVICE;v=2/Annotations(TechnicalName='SEPMRA_PROD_MAN',Version='0001')/$value/
            "
        `);
        // No changes in package.json expected
        expect(fs.readJSON(join(testDir, 'package.json'))).toStrictEqual({
            ui5: {
                dependencies: []
            }
        });
        // No removed annotation files expected
        expect(fs.exists(join(testDir, 'webapp', 'annotations', 'annotation.xml'))).toBe(true);
        expect(fs.exists(join(testDir, 'webapp', 'localService', 'mainService', 'SEPMRA_PROD_MAN.xml'))).toBe(true);
        expect(fs.exists(join(testDir, 'webapp', 'localService', 'mainService', 'metadata.xml'))).toBe(true);
    });

    it('Update an existing service without metadata.xml', async () => {
        fs.delete(join(testDir, 'webapp', 'localService', 'mainService', 'metadata.xml'));
        await update(
            testDir,
            {
                name: 'mainService',
                url: 'https://localhost',
                path: '/sap',
                type: ServiceType.EDMX,
                annotations: [
                    {
                        technicalName: 'SEPMRA_PROD_MAN',
                        xml: '<edmx:Edmx><?xml version="1.0" encoding="utf-8"?></edmx:Edmx>'
                    }
                ] as EdmxAnnotationsInfo[],
                metadata: '<edmx:Edmx><?xml version="1.0" encoding="utf-8"?></edmx:Edmx>',
                version: OdataVersion.v4,
                localAnnotationsName: 'annotation'
            },
            fs
        );
        expect(fs.exists(join(testDir, 'webapp', 'localService', 'mainService', 'metadata.xml'))).toBe(true);
    });

    it('Update an existing service without YAML updates, only update service files in localService', async () => {
        // Write dummy YAML files that could potentially be updated
        fs.write(join(testDir, 'ui5.yaml'), '');
        fs.write(join(testDir, 'ui5-mock.yaml'), '');
        fs.write(join(testDir, 'ui5-local.yaml'), '');
        // Delete metadata and annotation file from service folder
        fs.delete(join(testDir, 'webapp', 'localService', 'mainService', 'metadata.xml'));
        fs.delete(join(testDir, 'webapp', 'localService', 'mainService', 'SEPMRA_PROD_MAN.xml'));
        await update(
            testDir,
            {
                name: 'mainService',
                url: 'https://localhost',
                path: '/sap',
                type: ServiceType.EDMX,
                annotations: [
                    {
                        technicalName: 'SEPMRA_PROD_MAN',
                        xml: '<edmx:Edmx><?xml version="1.0" encoding="utf-8"?></edmx:Edmx>'
                    }
                ] as EdmxAnnotationsInfo[],
                metadata: '<edmx:Edmx><?xml version="1.0" encoding="utf-8"?></edmx:Edmx>',
                version: OdataVersion.v4,
                localAnnotationsName: 'annotation'
            },
            fs,
            false
        );
        // Check that YAML are not updated with backend and mockserver middlewares
        expect(fs.read(join(testDir, 'ui5.yaml'))).toBe('');
        expect(fs.read(join(testDir, 'ui5-mock.yaml'))).toBe('');
        expect(fs.read(join(testDir, 'ui5-local.yaml'))).toBe('');
        // Check that annotation and metadata files are created
        expect(fs.exists(join(testDir, 'webapp', 'localService', 'mainService', 'metadata.xml'))).toBe(true);
        expect(fs.exists(join(testDir, 'webapp', 'localService', 'mainService', 'SEPMRA_PROD_MAN.xml'))).toBe(true);
    });

    it('Update an existing service with changed annotations', async () => {
        await update(
            testDir,
            {
                name: 'mainService',
                url: 'https://localhost',
                path: '/sap',
                type: ServiceType.EDMX,
                // Define new remote annotation for service
                annotations: [
                    {
                        technicalName: 'DIFFERENT_ANNOTATION',
                        xml: '<edmx:Edmx><?xml version="1.0" encoding="utf-8"?></edmx:Edmx>'
                    }
                ] as EdmxAnnotationsInfo[],
                metadata: '<edmx:Edmx><?xml version="1.0" encoding="utf-8"?></edmx:Edmx>',
                version: OdataVersion.v4
            },
            fs
        );
        // verify updated manifest.json
        const manifest = fs.readJSON(join(testDir, 'webapp', 'manifest.json')) as Partial<projectAccess.Manifest>;
        expect(manifest?.['sap.app']?.dataSources).toStrictEqual({
            mainService: {
                uri: '/sap',
                type: 'OData',
                settings: {
                    annotations: ['DIFFERENT_ANNOTATION', 'annotation'],
                    localUri: 'localService/mainService/metadata.xml',
                    odataVersion: '4.0'
                }
            },
            DIFFERENT_ANNOTATION: {
                uri: `/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/Annotations(TechnicalName='DIFFERENT_ANNOTATION',Version='0001')/$value/`,
                type: 'ODataAnnotation',
                settings: {
                    localUri: 'localService/mainService/DIFFERENT_ANNOTATION.xml'
                }
            },
            annotation: {
                uri: 'annotations/annotation.xml',
                type: 'ODataAnnotation',
                settings: {
                    localUri: 'annotations/annotation.xml'
                }
            }
        });
        expect(manifest?.['sap.ui5']?.models).toStrictEqual({
            '': {
                dataSource: 'mainService',
                preload: true,
                settings: {
                    autoExpandSelect: true,
                    earlyRequests: true,
                    operationMode: 'Server'
                }
            }
        });
        // verify ui5.yaml, ui5-local.yaml, ui5-mock.yaml
        expect(fs.read(join(testDir, 'ui5.yaml'))).toMatchInlineSnapshot(`
            "server:
              customMiddleware:
                - name: fiori-tools-proxy
                  afterMiddleware: compression
                  configuration:
                    ignoreCertErrors: false # If set to true, certificate errors will be ignored. E.g. self-signed certificates will be accepted
                    backend:
                      - path: /sap
                        url: https://localhost
                    ui5:
                      path:
                        - /resources
                        - /test-resources
                      url: https://ui5.sap.com
            "
        `);
        expect(fs.read(join(testDir, 'ui5-local.yaml'))).toMatchInlineSnapshot(`
            "server:
              customMiddleware:
                - name: fiori-tools-proxy
                  afterMiddleware: compression
                  configuration:
                    ignoreCertErrors: false # If set to true, certificate errors will be ignored. E.g. self-signed certificates will be accepted
                    backend:
                      - path: /sap
                        url: https://localhost
                    ui5:
                      path:
                        - /resources
                        - /test-resources
                      url: https://ui5.sap.com
                - name: sap-fe-mockserver
                  beforeMiddleware: csp
                  configuration:
                    mountPath: /
                    services:
                      - urlPath: /sap
                        metadataPath: ./webapp/localService/mainService/metadata.xml
                        mockdataPath: ./webapp/localService/mainService/data
                        generateMockData: true
                    annotations:
                      - localPath: ./webapp/localService/mainService/DIFFERENT_ANNOTATION.xml
                        urlPath: /sap/opu/odata/IWFND/CATALOGSERVICE;v=2/Annotations(TechnicalName='DIFFERENT_ANNOTATION',Version='0001')/$value/
            "
        `);
        expect(fs.read(join(testDir, 'ui5-mock.yaml'))).toMatchInlineSnapshot(`
            "server:
              customMiddleware:
                - name: fiori-tools-proxy
                  afterMiddleware: compression
                  configuration:
                    ignoreCertErrors: false # If set to true, certificate errors will be ignored. E.g. self-signed certificates will be accepted
                    backend:
                      - path: /sap
                        url: https://localhost
                    ui5:
                      path:
                        - /resources
                        - /test-resources
                      url: https://ui5.sap.com
                - name: sap-fe-mockserver
                  beforeMiddleware: csp
                  configuration:
                    mountPath: /
                    services:
                      - urlPath: /sap
                        metadataPath: ./webapp/localService/mainService/metadata.xml
                        mockdataPath: ./webapp/localService/mainService/data
                        generateMockData: true
                    annotations:
                      - localPath: ./webapp/localService/mainService/DIFFERENT_ANNOTATION.xml
                        urlPath: /sap/opu/odata/IWFND/CATALOGSERVICE;v=2/Annotations(TechnicalName='DIFFERENT_ANNOTATION',Version='0001')/$value/
            "
        `);
        // No changes in package.json expected
        expect(fs.readJSON(join(testDir, 'package.json'))).toStrictEqual({
            ui5: {
                dependencies: []
            }
        });
        // Local annotations file should not be deleted
        expect(fs.exists(join(testDir, 'webapp', 'annotations', 'annotation.xml'))).toBe(true);
        // Previous annotation files should be deleted and new ones generated
        expect(fs.exists(join(testDir, 'webapp', 'localService', 'mainService', 'SEPMRA_PROD_MAN.xml'))).toBe(false);
        expect(fs.exists(join(testDir, 'webapp', 'localService', 'mainService', 'DIFFERENT_ANNOTATION.xml'))).toBe(
            true
        );
        expect(fs.exists(join(testDir, 'webapp', 'localService', 'mainService', 'metadata.xml'))).toBe(true);
    });

    it('Update an existing service without ui5-mock.yaml and ui5-local.yaml', async () => {
        fs.delete(join(testDir, 'ui5-mock.yaml'));
        fs.delete(join(testDir, 'ui5-local.yaml'));
        await update(
            testDir,
            {
                name: 'mainService',
                url: 'https://localhost',
                path: '/sap/uri/',
                type: ServiceType.EDMX,
                // Define new remote annotation for service
                annotations: [
                    {
                        technicalName: 'SEPMRA_PROD_MAN',
                        xml: '<edmx:Edmx><?xml version="1.0" encoding="utf-8"?></edmx:Edmx>'
                    }
                ] as EdmxAnnotationsInfo[],
                metadata: '<edmx:Edmx><?xml version="1.0" encoding="utf-8"?></edmx:Edmx>',
                version: OdataVersion.v4
            },
            fs
        );
        // verify updated manifest.json
        const manifest = fs.readJSON(join(testDir, 'webapp', 'manifest.json')) as Partial<projectAccess.Manifest>;
        expect(manifest?.['sap.app']?.dataSources).toStrictEqual({
            mainService: {
                uri: '/sap/uri/',
                type: 'OData',
                settings: {
                    annotations: ['SEPMRA_PROD_MAN', 'annotation'],
                    localUri: 'localService/mainService/metadata.xml',
                    odataVersion: '4.0'
                }
            },
            SEPMRA_PROD_MAN: {
                uri: `/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/Annotations(TechnicalName='SEPMRA_PROD_MAN',Version='0001')/$value/`,
                type: 'ODataAnnotation',
                settings: {
                    localUri: 'localService/mainService/SEPMRA_PROD_MAN.xml'
                }
            },
            annotation: {
                uri: 'annotations/annotation.xml',
                type: 'ODataAnnotation',
                settings: {
                    localUri: 'annotations/annotation.xml'
                }
            }
        });
        expect(manifest?.['sap.ui5']?.models).toStrictEqual({
            '': {
                dataSource: 'mainService',
                preload: true,
                settings: {
                    autoExpandSelect: true,
                    earlyRequests: true,
                    operationMode: 'Server'
                }
            }
        });
        // verify ui5.yaml, ui5-local.yaml, ui5-mock.yaml
        expect(fs.read(join(testDir, 'ui5.yaml'))).toMatchInlineSnapshot(`
            "server:
              customMiddleware:
                - name: fiori-tools-proxy
                  afterMiddleware: compression
                  configuration:
                    ignoreCertErrors: false # If set to true, certificate errors will be ignored. E.g. self-signed certificates will be accepted
                    backend:
                      - path: /sap
                        url: https://localhost
                    ui5:
                      path:
                        - /resources
                        - /test-resources
                      url: https://ui5.sap.com
            "
        `);
        expect(fs.exists(join(testDir, 'ui5-local.yaml'))).toBe(false);
        expect(fs.exists(join(testDir, 'ui5-mock.yaml'))).toBe(false);
        // No changes in package.json expected
        expect(fs.readJSON(join(testDir, 'package.json'))).toStrictEqual({
            ui5: {
                dependencies: []
            }
        });
        // Local annotations file should not be deleted
        expect(fs.exists(join(testDir, 'webapp', 'annotations', 'annotation.xml'))).toBe(true);
        // Remote annotation files should be updated
        expect(fs.exists(join(testDir, 'webapp', 'localService', 'mainService', 'SEPMRA_PROD_MAN.xml'))).toBe(true);
        expect(fs.exists(join(testDir, 'webapp', 'localService', 'mainService', 'metadata.xml'))).toBe(true);
    });
});

async function getSingleServiceMock(): Promise<Editor> {
    const fs = create(createStorage());
    const ui5Yaml = (await UI5Config.newInstance(''))
        .addFioriToolsProxyMiddleware({ ui5: {}, backend: [{ path: '/sap', url: 'https://localhost' }] })
        .toString();
    const ui5LocalYaml = (await UI5Config.newInstance(''))
        .addFioriToolsProxyMiddleware({ ui5: {}, backend: [{ path: '/sap', url: 'https://localhost' }] })
        .addMockServerMiddleware(
            testDir,
            join(testDir, 'webapp'),
            [{ serviceName: 'mainService', servicePath: '/sap' }],
            [
                {
                    urlPath: `/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/Annotations(TechnicalName='SEPMRA_PROD_MAN',Version='0001')/$value/`
                }
            ]
        )
        .toString();
    const ui5MockYaml = (await UI5Config.newInstance(''))
        .addFioriToolsProxyMiddleware({ ui5: {}, backend: [{ path: '/sap', url: 'https://localhost' }] })
        .addMockServerMiddleware(
            testDir,
            join(testDir, 'webapp'),
            [{ serviceName: 'mainService', servicePath: '/sap' }],
            [
                {
                    urlPath: `/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/Annotations(TechnicalName='SEPMRA_PROD_MAN',Version='0001')/$value/`
                }
            ]
        )
        .toString();
    // generate required files
    fs.write(join(testDir, 'ui5.yaml'), ui5Yaml);
    fs.write(join(testDir, 'ui5-local.yaml'), ui5LocalYaml);
    fs.write(join(testDir, 'ui5-mock.yaml'), ui5MockYaml);

    fs.writeJSON(join(testDir, 'package.json'), { ui5: { dependencies: [] } });

    fs.write(
        join(testDir, 'webapp', 'manifest.json'),
        JSON.stringify({
            'sap.app': {
                id: 'testappid',
                dataSources: {
                    mainService: {
                        uri: '/sap',
                        type: 'OData',
                        settings: {
                            annotations: ['SEPMRA_PROD_MAN', 'annotation'],
                            localUri: 'localService/mainService/metadata.xml'
                        }
                    },
                    SEPMRA_PROD_MAN: {
                        uri: `/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/Annotations(TechnicalName='SEPMRA_PROD_MAN',Version='0001')/$value/`,
                        type: 'ODataAnnotation',
                        settings: {
                            localUri: 'localService/mainService/SEPMRA_PROD_MAN.xml'
                        }
                    },
                    annotation: {
                        type: 'ODataAnnotation',
                        uri: 'annotations/annotation.xml',
                        settings: {
                            localUri: 'annotations/annotation.xml'
                        }
                    }
                }
            },
            'sap.ui5': {
                models: {
                    '': {
                        dataSource: 'mainService'
                    }
                }
            }
        })
    );
    // Annotations
    fs.write(join(testDir, 'webapp', 'annotations', 'annotation.xml'), '');
    fs.write(join(testDir, 'webapp', 'localService', 'mainService', 'SEPMRA_PROD_MAN.xml'), '');
    fs.write(join(testDir, 'webapp', 'localService', 'mainService', 'metadata.xml'), '');
    return fs;
}
