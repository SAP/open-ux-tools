import { jest } from '@jest/globals';
import nock from 'nock';
import * as realFs from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import supertest from 'supertest';
import type { Editor } from 'mem-fs-editor';
// eslint-disable-next-line sonarjs/no-implicit-dependencies
import type { ReaderCollection } from '@ui5/fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

import { type Logger, ToolsLogger } from '@sap-ux/logger';

// Named mocks for fs
const mockExistsSyncFn = jest.fn();
const mockWriteFileSyncFn = jest.fn();
const mockMkdirSyncFn = jest.fn();
const mockCopyFileSyncFn = jest.fn();

// Named mocks for helper
const mockGetExistingAdpProjectType = jest.fn();
const mockGetVariant = jest.fn();
const mockGetAdpConfig = jest.fn();
const mockIsTypescriptSupported = jest.fn();

// Named mocks for other namespace modules
const mockCreateAbapServiceProvider = jest.fn();
const mockGetAnnotationNamespaces = jest.fn();
const mockGenerateChange = jest.fn();
const mockInitMergedManifest = jest.fn();

// Named mocks for change-handler
const mockTryFixChange = jest.fn();
const mockAddXmlFragment = jest.fn();
const mockAddControllerExtension = jest.fn();

// Named mock for descriptor-change-handler
const mockAddCustomFragment = jest.fn();

// Named mock for ejs
const mockRenderFile = jest.fn();

// Named mock for store
const mockGetService = jest.fn();

// Pre-load real modules for spreading
const realHelper = await import('../../../src/base/helper');
const realSystemAccess = await import('@sap-ux/system-access/dist/base/connect');
const realServiceWriter = await import('@sap-ux/odata-service-writer/dist/data/annotations');
const realEditors = await import('../../../src/writer/editors');
const realChangeHandler = await import('../../../src/preview/change-handler');
const realDescriptorChangeHandler = await import('../../../src/preview/descriptor-change-handler');
const realStore = await import('@sap-ux/store');
const realEjs = await import('ejs');
const realOs = await import('node:os');

jest.unstable_mockModule('os', () => ({
    ...realOs,
    platform: jest.fn().mockImplementation(() => 'win32')
}));

jest.unstable_mockModule('../../../src/preview/change-handler', () => ({
    ...realChangeHandler,
    tryFixChange: mockTryFixChange,
    addXmlFragment: mockAddXmlFragment,
    addControllerExtension: mockAddControllerExtension
}));

jest.unstable_mockModule('../../../src/preview/descriptor-change-handler', () => ({
    ...realDescriptorChangeHandler,
    addCustomFragment: mockAddCustomFragment
}));

jest.unstable_mockModule('@sap-ux/store', () => ({
    ...realStore,
    getService: mockGetService.mockImplementation(() =>
        Promise.resolve({
            read: jest.fn().mockReturnValue({ username: '~user', password: '~pass' })
        })
    )
}));

jest.unstable_mockModule('ejs', () => ({
    ...realEjs,
    renderFile: mockRenderFile
}));

jest.unstable_mockModule('node:fs', () => ({
    ...realFs,
    default: {
        ...realFs,
        existsSync: mockExistsSyncFn,
        writeFileSync: mockWriteFileSyncFn,
        mkdirSync: mockMkdirSyncFn,
        copyFileSync: mockCopyFileSyncFn
    },
    existsSync: mockExistsSyncFn,
    writeFileSync: mockWriteFileSyncFn,
    mkdirSync: mockMkdirSyncFn,
    copyFileSync: mockCopyFileSyncFn
}));

jest.unstable_mockModule('fs', () => ({
    ...realFs,
    default: {
        ...realFs,
        existsSync: mockExistsSyncFn,
        writeFileSync: mockWriteFileSyncFn,
        mkdirSync: mockMkdirSyncFn,
        copyFileSync: mockCopyFileSyncFn
    },
    existsSync: mockExistsSyncFn,
    writeFileSync: mockWriteFileSyncFn,
    mkdirSync: mockMkdirSyncFn,
    copyFileSync: mockCopyFileSyncFn
}));

jest.unstable_mockModule('../../../src/base/helper', () => ({
    ...realHelper,
    getExistingAdpProjectType: mockGetExistingAdpProjectType,
    getVariant: mockGetVariant,
    getAdpConfig: mockGetAdpConfig,
    isTypescriptSupported: mockIsTypescriptSupported
}));

jest.unstable_mockModule('@sap-ux/system-access/dist/base/connect', () => ({
    ...realSystemAccess,
    createAbapServiceProvider: mockCreateAbapServiceProvider
}));

jest.unstable_mockModule('@sap-ux/odata-service-writer/dist/data/annotations', () => ({
    ...realServiceWriter,
    getAnnotationNamespaces: mockGetAnnotationNamespaces
}));

jest.unstable_mockModule('../../../src/writer/editors', () => ({
    ...realEditors,
    generateChange: mockGenerateChange
}));

jest.unstable_mockModule('../../../src/base/abap/manifest-service', () => ({
    ManifestService: { initMergedManifest: mockInitMergedManifest }
}));

const { AdpPreview } = await import('../../../src');
import type { AddXMLChange, AdpPreviewConfig, CommonChangeProperties } from '../../../src/index.js';
const { addXmlFragment, tryFixChange, addControllerExtension } = await import('../../../src/preview/change-handler');
const { addCustomFragment } = await import('../../../src/preview/descriptor-change-handler');
const { AdaptationProjectType } = await import('@sap-ux/axios-extension');

interface GetFragmentsResponse {
    fragments: { fragmentName: string }[];
    message: string;
}

interface GetControllersResponse {
    controllers: { controllerName: string }[];
    message: string;
}

interface CodeExtResponse {
    controllerExists: boolean;
    controllerPath: string;
    controllerPathFromRoot: string;
}

const mockProject = {
    byGlob: jest.fn().mockResolvedValue([])
};

describe('AdaptationProject', () => {
    const backend = 'https://sap.example';
    const descriptorVariant = realFs.readFileSync(
        join(__dirname, '../../fixtures/adaptation-project/webapp', 'manifest.appdescr_variant'),
        'utf-8'
    );
    const mockMergedDescriptor = {
        asyncHints: {
            libs: [
                {
                    name: 'sap.ui.core'
                },
                {
                    name: 'sap.reuse.lib',
                    url: { url: '/sap/reuse/lib' }
                }
            ],
            components: [
                {
                    name: 'app.variant1',
                    url: { url: '/webapp' }
                },
                {
                    name: 'sap.io.lib.reuse'
                }
            ]
        },
        name: 'the.original.app',
        manifest: {
            'sap.app': {
                id: 'my.adaptation'
            }
        },
        url: '/my/adaptation'
    };

    const middlewareUtil = {
        getProject() {
            return {
                getRootPath() {
                    return '/projects/adp.project';
                },
                getSourcePath() {
                    return '/adp.project/webapp';
                },
                getName() {
                    return 'adp.project';
                },
                getNamespace() {
                    return 'adp/project';
                }
            };
        }
    };

    const logger = new ToolsLogger();
    describe('init', () => {
        beforeAll(() => {
            nock(backend)
                .get((path) => path.startsWith('/sap/bc/lrep/actions/getcsrftoken/'))
                .reply(200)
                .persist(true);
            nock(backend)
                .put('/sap/bc/lrep/appdescr_variant_preview/?workspacePath=//')
                .reply(200, {
                    'my.adaptation': mockMergedDescriptor
                })
                .persist(true);
        });
        afterAll(() => {
            nock.cleanAll();
        });
        test('default (no) config', async () => {
            mockGetExistingAdpProjectType.mockResolvedValue(AdaptationProjectType.ON_PREMISE);
            const adp = new AdpPreview(
                {
                    target: {
                        url: backend
                    }
                },
                mockProject as unknown as ReaderCollection,
                middlewareUtil,
                logger
            );

            mockProject.byGlob.mockResolvedValueOnce([
                {
                    getPath: () => '/manifest.appdescr_variant',
                    getBuffer: () => Buffer.from(descriptorVariant)
                }
            ]);
            await adp.init(JSON.parse(descriptorVariant));
            expect(adp.descriptor).toEqual(mockMergedDescriptor);
            expect(adp.resources).toEqual({
                'sap.reuse.lib': '/sap/reuse/lib',
                'the.original.app': mockMergedDescriptor.url,
                'app.variant1': '/webapp'
            });
            expect(adp.projectType).toBe(AdaptationProjectType.ON_PREMISE);
        });

        test('cloud project', async () => {
            mockGetExistingAdpProjectType.mockResolvedValue(AdaptationProjectType.CLOUD_READY);
            nock(backend)
                .get('/sap/bc/adt/discovery')
                .replyWithFile(200, join(__dirname, '..', '..', 'mockResponses/discovery.xml'));
            const adp = new AdpPreview(
                {
                    target: {
                        url: backend
                    }
                },
                mockProject as unknown as ReaderCollection,
                middlewareUtil,
                logger
            );

            mockProject.byGlob.mockResolvedValueOnce([
                {
                    getPath: () => '/manifest.appdescr_variant',
                    getBuffer: () => Buffer.from(descriptorVariant)
                }
            ]);
            await adp.init(JSON.parse(descriptorVariant));
            expect(adp.descriptor).toEqual(mockMergedDescriptor);
            expect(adp.resources).toEqual({
                'sap.reuse.lib': '/sap/reuse/lib',
                'the.original.app': mockMergedDescriptor.url,
                'app.variant1': '/webapp'
            });
            expect(adp.projectType).toEqual(AdaptationProjectType.CLOUD_READY);
        });

        test('error on property access before init', async () => {
            const adp = new AdpPreview(
                {
                    target: {
                        url: backend
                    }
                },
                mockProject as unknown as ReaderCollection,
                middlewareUtil,
                logger
            );

            expect(() => adp.descriptor).toThrow();
            expect(() => adp.resources).toThrow();
            await expect(() => adp.sync()).rejects.toEqual(Error('Not initialized'));
        });

        test('should initialize with cfBuildPath mode', async () => {
            const adp = new AdpPreview(
                {
                    target: {
                        url: backend
                    },
                    cfBuildPath: 'dist'
                },
                mockProject as unknown as ReaderCollection,
                middlewareUtil,
                logger
            );

            const parsedVariant = JSON.parse(descriptorVariant);
            const layer = await adp.init(parsedVariant);

            expect(layer).toBe(parsedVariant.layer);
            expect(adp.projectType).toBeUndefined();
            expect(adp['descriptorVariantId']).toBe(parsedVariant.id);
            expect(adp['routesHandler']).toBeDefined();
            expect(adp['provider']).toBeUndefined();
        });
    });

    describe('sync', () => {
        let secondCall: boolean = false;
        beforeAll(() => {
            nock(backend)
                .get((path) => path.startsWith('/sap/bc/lrep/actions/getcsrftoken/'))
                .reply(200)
                .persist(true);
            nock(backend)
                .put('/sap/bc/lrep/appdescr_variant_preview/?workspacePath=//')
                .reply(200, () => {
                    if (secondCall) {
                        return {
                            'my.adaptation': 'testDescriptor'
                        };
                    }
                    return {
                        'my.adaptation': mockMergedDescriptor
                    };
                })
                .persist(true);
        });

        afterAll(() => {
            nock.cleanAll();
        });

        afterEach(() => {
            global.__SAP_UX_MANIFEST_SYNC_REQUIRED__ = false;
        });

        test('should return early when cfBuildPath is set', async () => {
            // Create a separate nock scope for this test to avoid interfering with other tests
            const testBackend = 'https://test-backend.example';
            const adp = new AdpPreview(
                {
                    target: {
                        url: testBackend
                    },
                    cfBuildPath: 'dist'
                },
                mockProject as unknown as ReaderCollection,
                middlewareUtil,
                logger
            );

            const parsedVariant = JSON.parse(descriptorVariant);
            await adp.init(parsedVariant);

            // sync should return immediately without making any backend calls
            // Since cfBuildPath is set, sync should return early
            await adp.sync();
        });

        test('updates merged descriptor', async () => {
            global.__SAP_UX_MANIFEST_SYNC_REQUIRED__ = true;
            const adp = new AdpPreview(
                {
                    target: {
                        url: backend
                    }
                },
                mockProject as unknown as ReaderCollection,
                middlewareUtil,
                logger
            );

            mockProject.byGlob.mockResolvedValueOnce([
                {
                    getPath: () => '/manifest.appdescr_variant',
                    getBuffer: () => Buffer.from(descriptorVariant)
                }
            ]);
            await adp.init(JSON.parse(descriptorVariant));
            (adp as any).mergedDescriptor = undefined;
            await adp.sync();
            expect(adp.descriptor).toBeDefined();
        });

        test('skip updating the merge descriptor if no manifest changes and descriptor was already fetched', async () => {
            const adp = new AdpPreview(
                {
                    target: {
                        url: backend
                    }
                },
                mockProject as unknown as ReaderCollection,
                middlewareUtil,
                logger
            );

            mockProject.byGlob.mockResolvedValueOnce([
                {
                    getPath: () => '/manifest.appdescr_variant',
                    getBuffer: () => Buffer.from(descriptorVariant)
                }
            ]);
            await adp.init(JSON.parse(descriptorVariant));
            (adp as any).mergedDescriptor = undefined;
            await adp.sync();
            expect(adp.descriptor).toEqual(mockMergedDescriptor);
            secondCall = true;
            await adp.sync();
            secondCall = false;
            expect(adp.descriptor).not.toEqual('testDescriptor');
        });

        test('update descriptor if no manifest changes, but this is first descriptor fetch', async () => {
            const adp = new AdpPreview(
                {
                    target: {
                        url: backend
                    }
                },
                mockProject as unknown as ReaderCollection,
                middlewareUtil,
                logger
            );

            mockProject.byGlob.mockResolvedValueOnce([
                {
                    getPath: () => '/manifest.appdescr_variant',
                    getBuffer: () => Buffer.from(descriptorVariant)
                }
            ]);
            await adp.init(JSON.parse(descriptorVariant));
            (adp as any).mergedDescriptor = undefined;
            await adp.sync();
            expect(adp.descriptor).toEqual(mockMergedDescriptor);
        });

        test('update descriptor if descriptor was already fetched, but there are manifest changes', async () => {
            const adp = new AdpPreview(
                {
                    target: {
                        url: backend
                    }
                },
                mockProject as unknown as ReaderCollection,
                middlewareUtil,
                logger
            );

            mockProject.byGlob.mockResolvedValueOnce([
                {
                    getPath: () => '/manifest.appdescr_variant',
                    getBuffer: () => Buffer.from(descriptorVariant)
                }
            ]);
            await adp.init(JSON.parse(descriptorVariant));
            (adp as any).mergedDescriptor = undefined;
            await adp.sync();
            expect(adp.descriptor).toEqual(mockMergedDescriptor);
            secondCall = true;
            global.__SAP_UX_MANIFEST_SYNC_REQUIRED__ = true;
            await adp.sync();
            secondCall = false;
            expect(adp.descriptor).toEqual('testDescriptor');
        });
    });
    describe('proxy', () => {
        let server: supertest.Agent;
        const next = jest.fn().mockImplementation((_req, res) => res.status(200).send());
        beforeAll(async () => {
            nock(backend)
                .get((path) => path.startsWith('/sap/bc/lrep/actions/getcsrftoken/'))
                .reply(200)
                .persist(true);
            nock(backend)
                .put('/sap/bc/lrep/appdescr_variant_preview/?workspacePath=//')
                .reply(200, {
                    'my.adaptation': mockMergedDescriptor
                })
                .persist(true);
            const adp = new AdpPreview(
                {
                    target: {
                        url: backend
                    }
                },
                mockProject as unknown as ReaderCollection,
                middlewareUtil,
                logger
            );

            mockProject.byGlob.mockResolvedValueOnce([
                {
                    getPath: () => '/manifest.appdescr_variant',
                    getBuffer: () => Buffer.from(descriptorVariant)
                }
            ]);
            await adp.init(JSON.parse(descriptorVariant));

            const app = express();
            app.use(adp.descriptor.url, adp.proxy.bind(adp));
            app.get(`${mockMergedDescriptor.url}/original.file`, next);
            app.use((req) => fail(`${req.path} should have been intercepted.`));

            server = supertest(app);
        });

        afterAll(() => {
            nock.cleanAll();
        });

        afterEach(() => {
            global.__SAP_UX_MANIFEST_SYNC_REQUIRED__ = false;
        });

        test('/manifest.json with sync', async () => {
            global.__SAP_UX_MANIFEST_SYNC_REQUIRED__ = true;
            const syncSpy = jest.spyOn(AdpPreview.prototype, 'sync').mockImplementation(() => Promise.resolve());
            const response = await server.get('/my/adaptation/manifest.json').expect(200);
            expect(syncSpy).toHaveBeenCalledTimes(1);
            expect(JSON.parse(response.text)).toEqual(mockMergedDescriptor.manifest);
        });

        test('/manifest.json', async () => {
            const response = await server.get('/my/adaptation/manifest.json').expect(200);
            expect(JSON.parse(response.text)).toEqual(mockMergedDescriptor.manifest);
        });

        test('/Component-preload.js', async () => {
            await server.get('/my/adaptation/Component-preload.js').expect(404);
        });

        test('/local-file.ts', async () => {
            const localPath = '/local-file';
            mockProject.byGlob.mockResolvedValueOnce([
                {
                    getPath: () => `${localPath}.ts`
                }
            ]);
            const response = await server.get(`${mockMergedDescriptor.url}${localPath}.js`).expect(302);
            expect(response.text).toEqual(`Found. Redirecting to ${localPath}.js`);
            expect(mockProject.byGlob).toHaveBeenCalledWith(`${localPath}.*`);
        });

        test('/original.file', async () => {
            await server.get(`${mockMergedDescriptor.url}/original.file`).expect(200);
            expect(next).toHaveBeenCalled();
        });
    });

    describe('onChangeRequest', () => {
        const mockFs = {} as unknown as Editor;
        const mockLogger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() } as unknown as Logger;

        const adp = new AdpPreview(
            {} as AdpPreviewConfig,
            mockProject as unknown as ReaderCollection,
            middlewareUtil,
            logger
        );

        const addXMLChange = {
            changeType: 'addXML',
            content: {
                fragmentPath: 'fragments/share.fragment.xml'
            },
            reference: 'some.reference'
        } as unknown as AddXMLChange;

        const addCodeExtChange = {
            changeType: 'codeExt',
            content: {
                codeRef: 'coding/test.js',
                view: 'view'
            }
        } as unknown as CommonChangeProperties;

        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('should fix the change if type is "read" and conditions meet', async () => {
            await adp.onChangeRequest('read', addXMLChange, mockFs, mockLogger);

            expect(mockTryFixChange).toHaveBeenCalledWith(addXMLChange, mockLogger);
        });

        it('should add an XML fragment if type is "write" and change is AddXMLChange', async () => {
            await adp.onChangeRequest('write', addXMLChange, mockFs, mockLogger);

            expect(mockAddXmlFragment).toHaveBeenCalledWith(
                '/adp.project/webapp',
                addXMLChange,
                mockFs,
                mockLogger,
                undefined
            );
        });

        it('should not perform any action if type is "delete"', async () => {
            const change = { changeType: 'delete', content: {} } as unknown as CommonChangeProperties;
            await adp.onChangeRequest('delete', change, mockFs, mockLogger);

            expect(tryFixChange).not.toHaveBeenCalled();
            expect(addXmlFragment).not.toHaveBeenCalled();
        });

        it('should add an Controller Extension if type is "write" and change is addCodeExtChange', async () => {
            await adp.onChangeRequest('write', addCodeExtChange, mockFs, mockLogger);

            expect(mockAddControllerExtension).toHaveBeenCalledWith(
                '/projects/adp.project',
                '/adp.project/webapp',
                addCodeExtChange,
                mockFs,
                mockLogger
            );
        });

        it('should add an custom XML fragment if type is "write" and change is v4 Descriptor change', async () => {
            await adp.onChangeRequest(
                'write',
                {
                    changeType: 'appdescr_fe_changePageConfiguration',
                    projectId: 'adp.v1',
                    content: {
                        entityPropertyChange: {
                            propertyPath: 'content/body/sections/test',
                            propertyValue: {
                                template: 'adp.v1.changes.fragments.test'
                            }
                        }
                    }
                } as unknown as CommonChangeProperties,
                mockFs,
                mockLogger
            );

            expect(mockAddCustomFragment).toHaveBeenCalledWith(
                '/adp.project/webapp',
                {
                    changeType: 'appdescr_fe_changePageConfiguration',
                    projectId: 'adp.v1',
                    content: {
                        entityPropertyChange: {
                            propertyPath: 'content/body/sections/test',
                            propertyValue: {
                                template: 'adp.v1.changes.fragments.test'
                            }
                        }
                    }
                },
                mockFs,
                mockLogger
            );
        });
    });

    describe('addApis', () => {
        let server: supertest.Agent;
        beforeAll(async () => {
            nock(backend)
                .get((path) => path.startsWith('/sap/bc/lrep/actions/getcsrftoken/'))
                .reply(200)
                .persist(true);
            nock(backend)
                .put('/sap/bc/lrep/appdescr_variant_preview/?workspacePath=//')
                .reply(200, {
                    'my.adaptation': mockMergedDescriptor
                })
                .persist(true);
            const adp = new AdpPreview(
                {
                    target: {
                        url: backend
                    }
                },
                mockProject as unknown as ReaderCollection,
                middlewareUtil,
                logger
            );
            await adp.init(JSON.parse(descriptorVariant));
            mockGetVariant.mockResolvedValue({
                content: [],
                id: 'adp/project',
                layer: 'VENDOR',
                namespace: 'test',
                reference: 'adp/project'
            });

            mockGetAdpConfig.mockResolvedValue({
                target: {
                    destination: 'testDestination'
                },
                ignoreCertErrors: false
            });
            mockIsTypescriptSupported.mockReturnValue(false);

            mockCreateAbapServiceProvider.mockResolvedValue({} as any);
            mockInitMergedManifest.mockResolvedValue({
                getDataSourceMetadata: jest.fn().mockResolvedValue(`
                    <?xml version="1.0" encoding="utf-8"?>
<edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" xmlns="http://docs.oasis-open.org/odata/ns/edm">
    <edmx:DataServices>
        <Schema Namespace="com.sap.gateway.srvd.c_salesordermanage_sd.v0001" Alias="SAP__self">
         </Schema>
    </edmx:DataServices>
</edmx:Edmx>`),
                getManifestDataSources: jest.fn().mockReturnValue({
                    mainService: {
                        type: 'OData',
                        uri: 'main/service/uri',
                        settings: {
                            annotations: ['annotation0']
                        }
                    },
                    annotation0: {
                        type: 'ODataAnnotation',
                        uri: `ui5://adp/project/annotation0.xml`
                    },
                    secondaryService: {
                        type: 'OData',
                        uri: 'secondary/service/uri',
                        settings: {
                            annotations: []
                        }
                    }
                })
            } as any);
            mockExistsSyncFn.mockReturnValueOnce(true).mockReturnValue(false);
            mockGetAnnotationNamespaces.mockReturnValue([
                {
                    namespace: 'com.sap.gateway.srvd.c_salesordermanage_sd.v0001',
                    alias: 'test'
                }
            ]);
            mockGenerateChange.mockResolvedValue({
                commit: jest.fn().mockResolvedValue('commited')
            } as any);
            const app = express();
            app.use(express.json());
            adp.addApis(app);
            server = supertest(app);
        });

        afterEach(() => {
            mockExistsSyncFn.mockReset();
            mockWriteFileSyncFn.mockReset();
        });

        test('GET /adp/api/fragment', async () => {
            const expectedNames = [{ fragmentName: 'my.fragment.xml' }, { fragmentName: 'other.fragment.xml' }];
            mockProject.byGlob.mockResolvedValueOnce([
                {
                    getName: () => expectedNames[0].fragmentName
                },
                {
                    getName: () => expectedNames[1].fragmentName
                }
            ]);
            const response = await server.get('/adp/api/fragment').expect(200);
            const data: GetFragmentsResponse = JSON.parse(response.text);
            expect(data.fragments).toEqual(expectedNames);
            expect(data.message).toEqual(`${expectedNames.length} fragments found in the project workspace.`);
        });

        test('GET /adp/api/fragment - returns empty array of fragment', async () => {
            const response = await server.get('/adp/api/fragment').expect(200);
            const data: GetFragmentsResponse = JSON.parse(response.text);
            expect(data.fragments.length).toEqual(0);
            expect(data.message).toEqual(`0 fragments found in the project workspace.`);
        });

        test('GET /adp/api/fragment - throws error', async () => {
            const errorMsg = 'Could not get fragment name';
            mockProject.byGlob.mockResolvedValueOnce([
                {
                    getName: () => {
                        throw new Error(errorMsg);
                    }
                }
            ]);
            const response = await server.get('/adp/api/fragment').expect(500);
            const data: GetFragmentsResponse = JSON.parse(response.text);
            expect(data.message).toEqual(errorMsg);
        });

        test('GET /adp/api/controller', async () => {
            const expectedNames = [{ controllerName: 'my' }, { controllerName: 'other' }];
            mockProject.byGlob.mockResolvedValueOnce([
                {
                    getName: () => 'my.js'
                },
                {
                    getName: () => 'other.js'
                }
            ]);
            const response = await server.get('/adp/api/controller').expect(200);
            const data: GetControllersResponse = JSON.parse(response.text);
            expect(data.controllers).toEqual(expectedNames);
            expect(data.message).toEqual(`${expectedNames.length} controllers found in the project workspace.`);
        });

        test('GET /adp/api/controller - returns empty array of controllers', async () => {
            const response = await server.get('/adp/api/controller').expect(200);
            const data: GetControllersResponse = JSON.parse(response.text);
            expect(data.controllers.length).toEqual(0);
            expect(data.message).toEqual(`0 controllers found in the project workspace.`);
        });

        test('GET /adp/api/controller - throws error', async () => {
            const errorMsg = 'Could not get controller name';
            mockProject.byGlob.mockResolvedValueOnce([
                {
                    getName: () => {
                        throw new Error(errorMsg);
                    }
                }
            ]);
            const response = await server.get('/adp/api/controller').expect(500);
            const data: GetControllersResponse = JSON.parse(response.text);
            expect(data.message).toEqual(errorMsg);
        });

        test('POST /adp/api/controller - creates controller', async () => {
            mockExistsSyncFn.mockReturnValue(false);
            mockRenderFile.mockImplementation((templatePath: any, data: any, options: any, callback: any) => {
                callback(undefined, 'test-js-controller');
            });
            const controllerName = 'Share';
            const controllerPath = join('/adp.project', 'webapp', 'changes', 'coding', 'Share.js');
            const response = await server.post('/adp/api/controller').send({ controllerName }).expect(201);

            const message = response.text;
            expect(mockWriteFileSyncFn).toHaveBeenNthCalledWith(1, controllerPath, 'test-js-controller', {
                encoding: 'utf8'
            });
            expect(message).toBe('Controller extension created!');
        });

        test('POST /adp/api/controller - creates TypeScript controller', async () => {
            mockExistsSyncFn.mockReturnValue(false);
            mockIsTypescriptSupported.mockReturnValue(true);
            mockRenderFile.mockImplementation((templatePath: any, data: any, options: any, callback: any) => {
                callback(undefined, 'test-ts-controller');
            });

            const controllerName = 'Share';
            const controllerPath = join('/adp.project', 'webapp', 'changes', 'coding', 'Share.ts');
            const response = await server.post('/adp/api/controller').send({ controllerName }).expect(201);

            const message = response.text;
            expect(mockWriteFileSyncFn).toHaveBeenNthCalledWith(1, controllerPath, 'test-ts-controller', {
                encoding: 'utf8'
            });
            expect(message).toBe('Controller extension created!');
        });

        test('POST /adp/api/controller - throws error during rendering a ts template', async () => {
            mockExistsSyncFn.mockReturnValue(false);
            mockIsTypescriptSupported.mockReturnValue(true);
            mockRenderFile.mockImplementation((templatePath: any, data: any, options: any, callback: any) => {
                callback(new Error('Failed to render template'), '');
            });

            const controllerName = 'Share';
            const response = await server.post('/adp/api/controller').send({ controllerName }).expect(500);

            const message = response.text;
            expect(mockWriteFileSyncFn).not.toHaveBeenCalled();
            expect(message).toBe('Error rendering TypeScript template Failed to render template');
        });

        test('POST /adp/api/controller - controller already exists', async () => {
            mockExistsSyncFn.mockReturnValueOnce(false).mockResolvedValueOnce(true);

            const controllerName = 'Share';
            const response = await server.post('/adp/api/controller').send({ controllerName }).expect(409);

            const message = response.text;
            expect(message).toBe(`Controller extension with name "${controllerName}" already exists`);
        });

        test('POST /adp/api/controller - controller name was not provided', async () => {
            const response = await server.post('/adp/api/controller').send({ controllerName: '' }).expect(400);

            const message = response.text;
            expect(message).toBe('Controller extension name was not provided!');
        });

        test('POST /adp/api/controller - throws error when controller name is undefined', async () => {
            const response = await server.post('/adp/api/controller').send({ controllerName: undefined }).expect(500);

            const message = response.text;
            expect(message).toBe('Input must be string');
        });

        test('GET /adp/api/code_ext - returns existing controller data', async () => {
            mockExistsSyncFn.mockReturnValue(true);
            const changeFileStr =
                '{"selector":{"controllerName":"sap.suite.ui.generic.template.ListReport.view.ListReport"},"content":{"codeRef":"coding/share.js"}}';
            mockProject.byGlob.mockResolvedValueOnce([
                {
                    getString: () => changeFileStr,
                    getName: () => 'id_124_codeExt.change'
                }
            ]);
            const response = await server
                .get('/adp/api/code_ext?name=sap.suite.ui.generic.template.ListReport.view.ListReport')
                .expect(200);
            const data: CodeExtResponse = JSON.parse(response.text);
            expect(data.controllerExists).toEqual(true);
        });

        test('GET /adp/api/code_ext - returns existing controller data with new syntax', async () => {
            mockExistsSyncFn.mockReturnValue(true);
            const changeFileStr =
                '{"selector":{"controllerName":"module:sap/suite/ui/generic/template/ListReport/view.ListReport.controller"},"content":{"codeRef":"coding/share.js"}}';
            mockProject.byGlob.mockResolvedValueOnce([
                {
                    getString: () => changeFileStr,
                    getName: () => 'id_124_codeExt.change'
                }
            ]);
            const response = await server
                .get(
                    '/adp/api/code_ext?name=module:sap/suite/ui/generic/template/ListReport/view.ListReport.controller'
                )
                .expect(200);
            const data: CodeExtResponse = JSON.parse(response.text);
            expect(data.controllerExists).toEqual(true);
        });

        test('GET /adp/api/code_ext - returns empty existing controller data (no control found)', async () => {
            mockExistsSyncFn.mockReturnValue(true);
            const changeFileStr =
                '{"selector":{"controllerName":"sap.suite.ui.generic.template.ListReport.view.ListReport"},"content":{"codeRef":"coding/share.js"}}';
            mockProject.byGlob.mockResolvedValueOnce([
                {
                    getString: () => changeFileStr
                }
            ]);
            const response = await server.get('/adp/api/code_ext?name=sap.suite.ui.generic.template.Dummy').expect(200);
            const data: CodeExtResponse = JSON.parse(response.text);
            expect(data.controllerExists).toEqual(false);
        });

        test('GET /adp/api/code_ext - returns not found if no controller extension file was found locally', async () => {
            mockExistsSyncFn.mockReturnValue(false);
            const changeFileStr =
                '{"selector":{"controllerName":"sap.suite.ui.generic.template.ListReport.view.ListReport"},"content":{"codeRef":"coding/share.js"}}';
            mockProject.byGlob.mockResolvedValueOnce([
                {
                    getString: () => changeFileStr,
                    getName: () => 'id_124_codeExt.change'
                }
            ]);
            await server
                .get('/adp/api/code_ext?name=sap.suite.ui.generic.template.ListReport.view.ListReport')
                .expect(404);
        });

        test('GET /adp/api/code_ext - throws error', async () => {
            const errorMsg = 'Could not retrieve existing controller data!';
            mockProject.byGlob.mockResolvedValueOnce([
                {
                    getString: () => {
                        throw new Error(errorMsg);
                    }
                }
            ]);

            try {
                await server.get('/adp/api/code_ext?name=sap.suite.ui.generic.template.ListReport.view.ListReport');
            } catch (e) {
                expect(e.message).toEqual(errorMsg);
            }
        });

        test('GET /adp/api/annotation', async () => {
            const response = await server.get('/adp/api/annotation').send().expect(200);

            const message = response.text;
            expect(message).toMatchInlineSnapshot(
                `"{\\"isRunningInBAS\\":false,\\"annotationDataSourceMap\\":{\\"mainService\\":{\\"annotationDetails\\":{\\"fileName\\":\\"annotation0.xml\\",\\"annotationPath\\":\\"//adp.project/webapp/annotation0.xml\\",\\"annotationPathFromRoot\\":\\"adp.project/annotation0.xml\\"},\\"serviceUrl\\":\\"main/service/uri\\"},\\"secondaryService\\":{\\"annotationDetails\\":{\\"annotationExistsInWS\\":false},\\"serviceUrl\\":\\"secondary/service/uri\\"}}}"`
            );
        });

        test('GET /adp/api/annotation => Metadata fetch error', async () => {
            mockInitMergedManifest.mockResolvedValue({
                getDataSourceMetadata: jest.fn().mockRejectedValue(new Error('Metadata fetch error')),
                getManifestDataSources: jest.fn().mockReturnValue({
                    mainService: {
                        type: 'OData',
                        uri: 'main/service/uri',
                        settings: {
                            annotations: ['annotation0']
                        }
                    },
                    annotation0: {
                        type: 'ODataAnnotation',
                        uri: `ui5://adp/project/annotation0.xml`
                    },
                    secondaryService: {
                        type: 'OData',
                        uri: 'secondary/service/uri',
                        settings: {
                            annotations: []
                        }
                    }
                })
            } as any);
            const response = await server.get('/adp/api/annotation').send().expect(200);

            const message = response.text;
            expect(message).toMatchInlineSnapshot(
                `"{\\"isRunningInBAS\\":false,\\"annotationDataSourceMap\\":{\\"mainService\\":{\\"annotationDetails\\":{\\"fileName\\":\\"annotation0.xml\\",\\"annotationPath\\":\\"//adp.project/webapp/annotation0.xml\\",\\"annotationPathFromRoot\\":\\"adp.project/annotation0.xml\\"},\\"serviceUrl\\":\\"main/service/uri\\",\\"metadataReadErrorMsg\\":\\"Metadata: Metadata fetch error\\"},\\"secondaryService\\":{\\"annotationDetails\\":{\\"annotationExistsInWS\\":false},\\"serviceUrl\\":\\"secondary/service/uri\\",\\"metadataReadErrorMsg\\":\\"Metadata: Metadata fetch error\\"}}}"`
            );
        });
    });

    describe('addApis - cfBuildPath mode', () => {
        let cfBuildPathServer: supertest.Agent;
        beforeAll(async () => {
            const adp = new AdpPreview(
                {
                    target: {
                        url: backend
                    },
                    cfBuildPath: 'dist'
                },
                mockProject as unknown as ReaderCollection,
                middlewareUtil,
                logger
            );
            await adp.init(JSON.parse(descriptorVariant));
            mockGetVariant.mockResolvedValue({
                content: [],
                id: 'adp/project',
                layer: 'VENDOR',
                namespace: 'test',
                reference: 'adp/project'
            });

            mockGetAdpConfig.mockResolvedValue({
                target: {
                    destination: 'testDestination'
                },
                ignoreCertErrors: false
            });
            mockIsTypescriptSupported.mockReturnValue(false);

            const app = express();
            app.use(express.json());
            adp.addApis(app);
            cfBuildPathServer = supertest(app);
        });

        test('GET /adp/api/annotation should return empty annotationDataSourceMap in cfBuildPath mode', async () => {
            const response = await cfBuildPathServer.get('/adp/api/annotation').send().expect(200);

            const message = response.text;
            expect(message).toMatchInlineSnapshot(`"{\\"isRunningInBAS\\":false,\\"annotationDataSourceMap\\":{}}"`);
        });
    });
});
