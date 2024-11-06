import type { OdataService } from '../../src';
import { generate, remove, OdataVersion, ServiceType } from '../../src';
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
            const manifest = fs.readJSON(join(root, 'webapp/manifest.json')) as any;
            expect(manifest['sap.app'].dataSources.mainService.uri).toBe(config.path);
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
            const manifest = fs.readJSON(join(root, 'webapp/manifest.json')) as any;
            expect(manifest['sap.app'].dataSources.mainService.uri).toBe(config.path);
            expect(fs.readJSON(packagePath)).toEqual({});
        });

        it('Standard folder structure - all files updated', async () => {
            const getWebappPathMock = jest.spyOn(projectAccess, 'getWebappPath');
            const packagePath = join(root, 'package.json');
            fs.writeJSON(packagePath, {});
            const ui5YamlWithOutMiddleware = (await UI5Config.newInstance('')).setConfiguration({}).toString();
            fs.write(join(root, 'ui5.yaml'), ui5YamlWithOutMiddleware);

            await generate(root, config, fs);
            const manifest = fs.readJSON(join(root, 'webapp/manifest.json')) as any;
            expect(manifest['sap.app'].dataSources.mainService.uri).toBe(config.path);
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
            const manifest = fs.readJSON(join(root, 'webapp/manifest.json')) as any;
            expect(manifest['sap.app'].dataSources.mainService.uri).toBe(config.path);
            expect(fs.exists(join(root, 'ui5-mock.yaml'))).toBe(true);
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
            const manifest = fs.readJSON(join(testDir, 'webapp', 'manifest.json')) as any;
            expect(manifest['sap.app'].dataSources.mainService.uri).toBe(config.path);
            expect(manifest['sap.app'].dataSources[config.annotations.technicalName]).toBeDefined();
            // verify local copy of metadata
            expect(fs.read(join(testDir, 'webapp', 'localService', 'metadata.xml'))).toBe(config.metadata);
            expect(fs.read(join(testDir, 'webapp', 'localService', `${config.annotations.technicalName}.xml`))).toBe(
                config.annotations.xml
            );
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
            const manifest = fs.readJSON(join(testDir, 'webapp', 'manifest.json')) as any;
            expect(manifest['sap.app'].dataSources.mainService.uri).toBe(config.path);
            expect(manifest['sap.app'].dataSources[config.annotations[0].technicalName]).toBeDefined();
            expect(manifest['sap.app'].dataSources[config.annotations[1].technicalName]).toBeDefined();
            // verify local copy of metadata
            expect(fs.read(join(testDir, 'webapp', 'localService', 'metadata.xml'))).toBe(config.metadata);
            expect(fs.read(join(testDir, 'webapp', 'localService', `${config.annotations[0].technicalName}.xml`))).toBe(
                config.annotations[0].xml
            );
            expect(fs.read(join(testDir, 'webapp', 'localService', `${config.annotations[1].technicalName}.xml`))).toBe(
                config.annotations[1].xml
            );
        });

        it('Valid OData V4 service', async () => {
            const config = {
                ...commonConfig,
                version: OdataVersion.v4,
                name: 'myService'
            };
            await generate(testDir, config as OdataService, fs);

            // verify updated manifest.json
            const manifest = fs.readJSON(join(testDir, 'webapp', 'manifest.json')) as any;
            expect(manifest['sap.app'].dataSources[config.name].uri).toBe(config.path);
            // verify local copy of metadata
            expect(fs.read(join(testDir, 'webapp', 'localService', 'metadata.xml'))).toBe(config.metadata);
            // verify that no destination is added to the ui5.yaml
            expect(fs.read(join(testDir, 'ui5.yaml'))).not.toContain('destination: ');
            // verify that client is set
            expect(fs.read(join(testDir, 'ui5.yaml'))).toContain('client: ');
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
            const manifest = fs.readJSON(join(testDir, 'webapp', 'manifest.json')) as any;
            expect(manifest['sap.app'].dataSources.mainService.uri).toBe(config.path);
            // verify that the destination is added to the ui5.yaml
            expect(fs.read(join(testDir, 'ui5.yaml'))).toContain(`destination: ${config.destination.name}`);
            // verify that client is set
            expect(fs.read(join(testDir, 'ui5.yaml'))).toContain('client: ');
            // verify that no localService folder has been created
            expect(fs.exists(join(testDir, 'webapp', 'localService', 'metadata.xml'))).toBeFalsy();
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
                }
            };

            await generate(testDir, config as OdataService, fs);

            // verify tha the optional properties are being added
            expect(fs.read(join(testDir, 'ui5.yaml'))).toMatchInlineSnapshot(`
                "server:
                  customMiddleware:
                    - name: fiori-tools-proxy
                      afterMiddleware: compression
                      configuration:
                        ignoreCertError: false # If set to true, certificate errors will be ignored. E.g. self-signed certificates will be accepted
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
            const manifest = fs.readJSON(join(testDir, 'webapp', 'manifest.json')) as any;
            expect(manifest['sap.app'].dataSources.mainService.settings.annotations).toStrictEqual([]);
            // verify that the path is correct in ui5.yaml
            expect(fs.read(join(testDir, 'ui5.yaml'))).toContain('path: /V2');
        });

        it('Enhance unspecified input data with defaults', async () => {
            const config = {
                url: 'https://services.odata.org',
                path: '/V2/Northwind/Northwind.svc',
                version: OdataVersion.v2
            } as OdataService;

            let configCopy = cloneDeep(config);
            enhanceData(configCopy);
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

            configCopy = cloneDeep(Object.assign({}, config, { model: 'modelName', name: 'datasourceName' }));
            enhanceData(configCopy);
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

            // Undefined path does not throw but sets valid path
            configCopy = cloneDeep(Object.assign({}, config, { path: undefined }));
            enhanceData(configCopy);
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
            .addMockServerMiddleware([{ serviceName: 'mainService', servicePath: '/sap' }], [])
            .toString();
        const ui5MockYaml = (await UI5Config.newInstance(''))
            .addMockServerMiddleware([{ serviceName: 'mainService', servicePath: '/sap' }], [])
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
                            type: 'OData'
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
                annotations: []
            },
            fs
        );
        // verify updated manifest.json
        const manifest = fs.readJSON(join(testDir, 'webapp', 'manifest.json')) as any;
        expect(manifest['sap.app'].dataSources).toStrictEqual({
            mainService: {
                type: 'OData',
                uri: '/sap'
            }
        });
        expect(manifest['sap.ui5'].models).toStrictEqual({
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
    });
    it('Remove an existing service', async () => {
        await remove(
            testDir,
            {
                name: 'mainService',
                url: 'https://localhost',
                path: '/sap',
                type: ServiceType.EDMX,
                annotations: []
            },
            fs
        );
        // verify updated manifest.json
        const manifest = fs.readJSON(join(testDir, 'webapp', 'manifest.json')) as any;
        expect(manifest['sap.app'].dataSources).toStrictEqual({});
        expect(manifest['sap.ui5'].models).toStrictEqual({});
        // verify ui5.yaml, ui5-local.yaml, ui5-mock.yaml
        expect(fs.read(join(testDir, 'ui5.yaml'))).not.toContain('- path: /sap\n            url: http://localhost\n');
        expect(fs.read(join(testDir, 'ui5-local.yaml'))).not.toContain(
            '- path: /sap\n            url: http://localhost\n'
        );
        expect(fs.read(join(testDir, 'ui5-mock.yaml'))).not.toContain(
            'services:\n          - urlPath: /sap/odata/testme\n '
        );
    });
});
