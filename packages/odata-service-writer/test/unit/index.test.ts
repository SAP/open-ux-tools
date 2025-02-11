import type { EdmxAnnotationsInfo, OdataService } from '../../src';
import { generate, update, remove, OdataVersion, ServiceType } from '../../src';
import { join } from 'path';
import type { Editor } from 'mem-fs-editor';
import { create } from 'mem-fs-editor';
import { create as createStorage } from 'mem-fs';
import { enhanceData } from '../../src/data';
import cloneDeep from 'lodash/cloneDeep';
import { UI5Config } from '@sap-ux/ui5-config';
import { tmpdir } from 'os';
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
                Error(t('error.requiredProjectFileNotFound', { path: 'webapp/manifest.json' }))
            );
        });

        it('faulty manifest.json', async () => {
            //fs.delete(join(testDir, 'webapp/manifest.json'));
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
                .addFioriToolsProxydMiddleware({ ui5: {} })
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
            const ui5Yaml = (await UI5Config.newInstance('')).addFioriToolsProxydMiddleware({ ui5: {} }).toString();
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
                        ignoreCertError: true # If set to true, certificate errors will be ignored. E.g. self-signed certificates will be accepted
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

        it('Enhance unspecified input data with defaults', async () => {
            const config = {
                url: 'https://services.odata.org',
                path: '/V2/Northwind/Northwind.svc',
                version: OdataVersion.v2
            } as OdataService;
            // No services are defined - mainService used for service name and '' for service model
            let configCopy = cloneDeep(config);
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

            // Services already defined - actual service name and service model are used
            configCopy = cloneDeep(Object.assign({}, config, { model: 'modelName', name: 'datasourceName' }));
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
            // Undefined path does not throw but sets valid path
            configCopy = cloneDeep(Object.assign({}, config, { path: undefined }));
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

            // Service and annotation names are the same
            fs.writeJSON(join('webapp', 'manifest.json'), {
                'sap.app': { dataSources: { exisitingSerivce: { type: 'OData' } } }
            });
            configCopy = cloneDeep(Object.assign({}, config, { name: 'aname', annotations: { name: 'aname' } }));
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

            // mainService model already exists
            fs.writeJSON(join('webapp', 'manifest.json'), {
                'sap.app': { dataSources: { mainService: { type: 'OData' } } },
                'sap.ui5': { models: { '': { dataSource: 'mainService' } } }
            });
            // model called mainService is being added, '' should be used for model
            configCopy = cloneDeep(Object.assign({}, config, { name: 'mainService' }));
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

            // mainService model already exists
            fs.writeJSON(join('webapp', 'manifest.json'), {
                'sap.app': { dataSources: { mainService: { type: 'OData' } } },
                'sap.ui5': { models: { '': { dataSource: 'mainService' } } }
            });
            // model called differentService is being added, 'differentService' should be used for model
            configCopy = cloneDeep(Object.assign({}, config, { model: 'differentService' }));
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
        });
    });
});

describe('remove', () => {
    let fs: Editor;
    beforeEach(async () => {
        const ui5Yaml = (await UI5Config.newInstance(''))
            .addFioriToolsProxydMiddleware({ ui5: {}, backend: [{ path: '/sap', url: 'https://localhost' }] })
            .toString();
        const ui5LocalYaml = (await UI5Config.newInstance(''))
            .addFioriToolsProxydMiddleware({ ui5: {}, backend: [{ path: '/sap', url: 'https://localhost' }] })
            .addMockServerMiddleware(
                [{ serviceName: 'mainService', servicePath: '/sap' }],
                [
                    {
                        urlPath: `/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/Annotations(TechnicalName='SEPMRA_PROD_MAN',Version='0001')/$value/`
                    }
                ]
            )
            .toString();
        const ui5MockYaml = (await UI5Config.newInstance(''))
            .addFioriToolsProxydMiddleware({ ui5: {}, backend: [{ path: '/sap', url: 'https://localhost' }] })
            .addMockServerMiddleware(
                [{ serviceName: 'mainService', servicePath: '/sap' }],
                [
                    {
                        urlPath: `/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/Annotations(TechnicalName='SEPMRA_PROD_MAN',Version='0001')/$value/`
                    }
                ]
            )
            .toString();
        // generate required files
        fs = create(createStorage());
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
    });
    it('Try to remove an unexisting service', async () => {
        await remove(
            testDir,
            {
                name: 'dummyService',
                url: 'https://dummyUrl',
                path: '/dummyPath',
                type: ServiceType.EDMX,
                annotations: [{ technicalName: 'dummy-technical-name' }] as EdmxAnnotationsInfo[]
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
                ] as EdmxAnnotationsInfo[]
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
    });
});

describe('update', () => {
    let fs: Editor;
    beforeEach(async () => {
        const ui5Yaml = (await UI5Config.newInstance(''))
            .addFioriToolsProxydMiddleware({ ui5: {}, backend: [{ path: '/sap', url: 'https://localhost' }] })
            .toString();
        const ui5LocalYaml = (await UI5Config.newInstance(''))
            .addFioriToolsProxydMiddleware({ ui5: {}, backend: [{ path: '/sap', url: 'https://localhost' }] })
            .addMockServerMiddleware(
                [{ serviceName: 'mainService', servicePath: '/sap' }],
                [
                    {
                        urlPath: `/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/Annotations(TechnicalName='SEPMRA_PROD_MAN',Version='0001')/$value/`
                    }
                ]
            )
            .toString();
        const ui5MockYaml = (await UI5Config.newInstance(''))
            .addFioriToolsProxydMiddleware({ ui5: {}, backend: [{ path: '/sap', url: 'https://localhost' }] })
            .addMockServerMiddleware(
                [{ serviceName: 'mainService', servicePath: '/sap' }],
                [
                    {
                        urlPath: `/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/Annotations(TechnicalName='SEPMRA_PROD_MAN',Version='0001')/$value/`
                    }
                ]
            )
            .toString();
        // generate required files
        fs = create(createStorage());
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
                            dataSource: 'mainService',
                            preload: true,
                            settings: {
                                autoExpandSelect: true,
                                earlyRequests: true,
                                operationMode: 'Server'
                            }
                        }
                    }
                }
            })
        );
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
    });
    it('Update an existing service without changes', async () => {
        await update(
            testDir,
            {
                name: 'mainService',
                url: 'https://localhost',
                path: '/sap/uri/',
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
        // expect(fs.read(join(testDir, 'ui5.yaml'))).toContain('- path: /sap\n            url: http://localhost\n');
        // expect(fs.read(join(testDir, 'ui5-local.yaml'))).toContain('- path: /sap\n            url: http://localhost\n');
        // expect(fs.read(join(testDir, 'ui5-mock.yaml'))).toContain('services:\n          - urlPath: /sap/uri\n ');
        // expect(fs.read(join(testDir, 'ui5-mock.yaml'))).toContain(
        //     `annotations:\n          - localPath: ./webapp/localService/mainService/SEPMRA_PROD_MAN.xml`
        // );
        // No changes in package.json expected
        // expect(fs.readJSON(join(testDir, 'package.json'))).toStrictEqual({
        //     ui5: {
        //         dependencies: []
        //     }
        // });
        // expect(fs.exists(join(testDir, 'webapp', 'localService', 'mainService', 'SEPMRA_PROD_MAN.xml'))).toBe(true);
        // expect(fs.exists(join(testDir, 'webapp', 'localService', 'mainService', 'metadata.xml'))).toBe(true);
        // expect(fs.exists(join(testDir, 'webapp', 'annotations', 'annotation.xml'))).toBe(true);
    });

    it('Update an existing service with changed annotations', async () => {
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
                uri: '/sap/uri/',
                type: 'OData',
                settings: {
                    annotations: ['DIFFERENT_ANNOTATION'],
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
        // expect(fs.read(join(testDir, 'ui5.yaml'))).toContain('- path: /sap\n            url: http://localhost\n');
        // expect(fs.read(join(testDir, 'ui5-local.yaml'))).toContain('- path: /sap\n            url: http://localhost\n');
        // expect(fs.read(join(testDir, 'ui5-mock.yaml'))).toContain('services:\n          - urlPath: /sap/uri\n ');
        // expect(fs.read(join(testDir, 'ui5-mock.yaml'))).toContain(
        //     `annotations:\n          - localPath: /sap/opu/odata/IWFND/CATALOGSERVICE;v=2/Annotations(TechnicalName='DIFFERENT_ANNOTATION',Version='0001')/$value/\n`
        // );
        // No changes in package.json expected
        // expect(fs.readJSON(join(testDir, 'package.json'))).toStrictEqual({
        //     ui5: {
        //         dependencies: []
        //     }
        // });
        // // Previous service annotation file should be deleted
        // expect(fs.exists(join(testDir, 'webapp', 'localService', 'mainService', 'SEPMRA_PROD_MAN.xml'))).toBe(false);
        // expect(fs.exists(join(testDir, 'webapp', 'localService', 'mainService', 'DIFFERENT_ANNOTATION.xml'))).toBe(
        //     true
        // );
        // expect(fs.exists(join(testDir, 'webapp', 'localService', 'mainService', 'metadata.xml'))).toBe(true);
        // expect(fs.exists(join(testDir, 'webapp', 'annotations', 'annotation.xml'))).toBe(true);
    });
});
