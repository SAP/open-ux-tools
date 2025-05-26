import { deleteServiceData } from '../../src/delete';
import type { Editor } from 'mem-fs-editor';
import { create } from 'mem-fs-editor';
import { create as createStorage } from 'mem-fs';
import type { OdataService } from '../../src';
import { OdataVersion, ServiceType } from '../../src';
import type { Manifest } from '@sap-ux/project-access';
import { updateManifest } from '../../src/data/manifest';
import { expectedEdmxManifest } from '../test-data/manifest-json/edmx-manifest';
import { expectedEdmxManifestMultipleAnnotations } from '../test-data/manifest-json/edmx-manifest-multiple-annotations';
import { expectedEdmxManifestMultipleServices } from '../test-data/manifest-json/edmx-manifest-multiple-services';
import { expectedEdmxManifestOlderServices } from '../test-data/manifest-json/edmx-manifest-older-services';
import { expectedCdsManifest } from '../test-data/manifest-json/cap-manifest';
import { expectedEdmxManifestLocalAnnotation } from '../test-data/manifest-json/edmx-manifest-local-annotation'; // single local annotation
import { expectedEdmxManifestLocalAnnotations } from '../test-data/manifest-json/edmx-manifest-local-annotations'; // multiple local annotations
import { expectedEdmxManifestMissingAnnotations } from '../test-data/manifest-json/edmx-manifest-missing-annotation-datasources'; // missing annotation definitions
import { expectedEdmxManifesNoAnnotations } from '../test-data/manifest-json/edmx-manifest-no-annotations'; // no any annotations

describe('manifest', () => {
    let fs: Editor;
    beforeEach(async () => {
        fs = create(createStorage());
    });
    describe('updateManifest', () => {
        afterEach(() => {
            jest.restoreAllMocks();
        });
        test.each([
            ['1.110.0', 'None'],
            ['1.115.0', undefined],
            ['', undefined],
            ['1.105.0', 'None'],
            [undefined, undefined],
            [['1.120.10', '2.0.0'], undefined]
        ])('Ensure synchronizationMode is correctly set for minUI5Version %s', async (minUI5Version, syncMode) => {
            const testManifest = {
                'sap.app': {
                    id: 'test.update.manifest'
                },
                'sap.ui5': {
                    dependencies: {
                        minUI5Version: minUI5Version
                    }
                }
            };

            const service: OdataService = {
                version: OdataVersion.v4,
                client: '123',
                model: 'amodel',
                name: 'aname',
                path: '/a/path'
            };

            // Write the test manifest to a file
            fs.writeJSON('./webapp/manifest.json', testManifest);

            // Call updateManifest
            await updateManifest('./', service, fs);
            const manifestJson = fs.readJSON('./webapp/manifest.json') as Partial<Manifest>;
            expect(manifestJson['sap.ui5']?.models?.['amodel'].settings?.['synchronizationMode']).toEqual(syncMode);
        });
        test('Ensure manifest are updated as expected as in edmx projects', async () => {
            const testManifest = {
                'sap.app': {
                    id: 'test.update.manifest'
                }
            };
            const service: OdataService = {
                version: OdataVersion.v2,
                client: '123',
                model: 'amodel',
                name: 'aname',
                path: '/a/path',
                type: ServiceType.EDMX,
                annotations: {
                    technicalName: 'test',
                    xml: 'test',
                    name: 'test'
                },
                localAnnotationsName: 'test'
            };

            fs.writeJSON('./webapp/manifest.json', testManifest);
            // Call updateManifest
            await updateManifest('./', service, fs);
            const manifestJson = fs.readJSON('./webapp/manifest.json');
            expect(manifestJson).toEqual(expectedEdmxManifest);
        });

        test('Ensure manifest are updated as expected as in edmx projects with custom model settings', async () => {
            const testManifest = {
                'sap.app': {
                    id: 'test.update.manifest'
                },
                'sap.ui5': {
                    models: {
                        amodel: {
                            settings: {
                                existingModelProp: true
                            }
                        }
                    }
                }
            };
            const service: OdataService = {
                version: OdataVersion.v4,
                client: '123',
                model: 'amodel',
                name: 'aname',
                path: '/a/path',
                type: ServiceType.EDMX
            };

            fs.writeJSON('./webapp/manifest.json', testManifest);
            // Call updateManifest
            await updateManifest('./', service, fs);
            const manifestJson = fs.readJSON('./webapp/manifest.json') as Partial<Manifest>;
            expect(manifestJson['sap.ui5']?.models?.['amodel']?.settings).toStrictEqual({
                autoExpandSelect: true,
                earlyRequests: true,
                existingModelProp: true,
                operationMode: 'Server'
            });
        });

        test('Ensure manifest are updated as expected as in edmx projects with local annotation', async () => {
            const testManifest = {
                'sap.app': {
                    id: 'test.update.manifest',
                    dataSources: {
                        'mainService': {
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
            };
            const service: OdataService = {
                version: OdataVersion.v2,
                client: '123',
                model: 'amodel',
                name: 'aname',
                path: '/a/path',
                type: ServiceType.EDMX,
                annotations: [], // No remote annotations
                localAnnotationsName: 'localTest' // Local annotation
            };
            fs.writeJSON('./webapp/manifest.json', testManifest);
            // Call updateManifest
            await updateManifest('./', service, fs);
            const manifestJson = fs.readJSON('./webapp/manifest.json');
            expect(manifestJson).toEqual(expectedEdmxManifestLocalAnnotation);
        });

        test('Ensure manifest are updated as expected as in edmx projects with multiple local annotations', async () => {
            const testManifest = {
                'sap.app': {
                    id: 'test.update.manifest',
                    dataSources: {
                        'mainService': {
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
            };
            const service: OdataService = {
                version: OdataVersion.v2,
                client: '123',
                model: 'amodel',
                name: 'aname',
                path: '/a/path',
                type: ServiceType.EDMX,
                annotations: [], // No remote annotations
                localAnnotationsName: ['localTest0', 'localTest1'] // Multiple local annotations
            };
            fs.writeJSON('./webapp/manifest.json', testManifest);
            // Call updateManifest
            await updateManifest('./', service, fs);
            const manifestJson = fs.readJSON('./webapp/manifest.json');
            expect(manifestJson).toEqual(expectedEdmxManifestLocalAnnotations);
        });

        test('Ensure manifest are updated as expected as in edmx projects without annotation definitions', async () => {
            const testManifest = {
                'sap.app': {
                    id: 'test.update.manifest',
                    dataSources: {
                        'mainService': {
                            type: 'OData',
                            settings: {
                                annotations: ['annotation'] // annotation is set to dataSource, but not defined for existing service
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
            };
            const service: OdataService = {
                version: OdataVersion.v2,
                client: '123',
                model: 'amodel',
                name: 'aname',
                path: '/a/path',
                type: ServiceType.EDMX
            };
            fs.writeJSON('./webapp/manifest.json', testManifest);
            // Call updateManifest
            await updateManifest('./', service, fs);
            const manifestJson = fs.readJSON('./webapp/manifest.json');
            expect(manifestJson).toEqual(expectedEdmxManifestMissingAnnotations);
        });

        test('Ensure manifest are updated as expected as in edmx projects without any annotations', async () => {
            const testManifest = {
                'sap.app': {
                    id: 'test.update.manifest',
                    dataSources: {
                        'mainService': {
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
            };
            const service: OdataService = {
                version: OdataVersion.v2,
                client: '123',
                model: 'amodel',
                name: 'aname',
                path: '/a/path',
                type: ServiceType.EDMX,
                annotations: [], // No remote annotations
                localAnnotationsName: [] // No local annotations
            };
            fs.writeJSON('./webapp/manifest.json', testManifest);
            // Call updateManifest
            await updateManifest('./', service, fs);
            const manifestJson = fs.readJSON('./webapp/manifest.json');
            expect(manifestJson).toEqual(expectedEdmxManifesNoAnnotations);
        });

        test('Ensure manifest are updated as expected as in edmx projects with multiple annotations', async () => {
            const testManifest = {
                'sap.app': {
                    id: 'test.update.manifest'
                }
            };
            const service: OdataService = {
                version: OdataVersion.v2,
                client: '123',
                model: 'amodel',
                name: 'aname',
                path: '/a/path',
                type: ServiceType.EDMX,
                annotations: [
                    {
                        technicalName: 'annotation1Technical',
                        xml: 'annotation1xml',
                        name: 'annotation1'
                    },
                    {
                        technicalName: 'annotation2Technical',
                        xml: 'annotation2xml',
                        name: 'annotation2'
                    }
                ],
                localAnnotationsName: 'localTest'
            };

            fs.writeJSON('./webapp/manifest.json', testManifest);
            // Call updateManifest
            await updateManifest('./', service, fs);
            const manifestJson = fs.readJSON('./webapp/manifest.json');
            expect(manifestJson).toEqual(expectedEdmxManifestMultipleAnnotations);
        });

        test('Ensure manifest are updated as expected as in edmx projects with multiple services', async () => {
            const testManifest = {
                'sap.app': {
                    id: 'test.update.manifest',
                    dataSources: {
                        'mainService': {
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
            };
            const service: OdataService = {
                version: OdataVersion.v2,
                client: '123',
                model: 'amodel',
                name: 'aname',
                path: '/a/path',
                type: ServiceType.EDMX,
                annotations: [
                    {
                        technicalName: 'annotation1Technical',
                        xml: 'annotation1xml',
                        name: 'annotation1'
                    }
                ],
                localAnnotationsName: 'localTest'
            };

            fs.writeJSON('./webapp/manifest.json', testManifest);
            // Call updateManifest
            await updateManifest('./', service, fs);
            const manifestJson = fs.readJSON('./webapp/manifest.json');
            expect(manifestJson).toEqual(expectedEdmxManifestMultipleServices);
        });

        test('Ensure manifest are updated as expected as in edmx projects with older services', async () => {
            // Test to basically check whether existing service definitions are updated (localUri attribute is modified)
            const testManifest = {
                'sap.app': {
                    id: 'test.update.manifest',
                    dataSources: {
                        mainService: {
                            type: 'OData',
                            settings: {
                                annotations: ['SEPMRA_OVW_ANNO_MDL']
                            }
                        },
                        SEPMRA_OVW_ANNO_MDL: {
                            type: 'ODataAnnotation',
                            settings: {
                                localUri: 'localService/SEPMRA_OVW_ANNO_MDL.xml' // localUri defined in localService folder - should be updated
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
            };
            const service: OdataService = {
                version: OdataVersion.v2,
                client: '123',
                model: 'amodel',
                name: 'aname',
                path: '/a/path',
                type: ServiceType.EDMX,
                annotations: []
            };

            fs.writeJSON('./webapp/manifest.json', testManifest);
            // Call updateManifest
            await updateManifest('./', service, fs);
            const manifestJson = fs.readJSON('./webapp/manifest.json');
            expect(manifestJson).toEqual(expectedEdmxManifestOlderServices);
        });

        test('Ensure manifest are updated as expected as in cds projects', async () => {
            const testManifest = {
                'sap.app': {
                    id: 'test.update.manifest'
                }
            };
            const service: OdataService = {
                version: OdataVersion.v2,
                client: '123',
                model: 'amodel',
                name: 'aname',
                path: '/a/path',
                type: ServiceType.CDS,
                annotations: {
                    cdsFileContents: `using AdminService as service from \'../../srv/admin-service\'`,
                    projectPath: 'projectPath',
                    appPath: 'appPath',
                    projectName: 'projectName'
                }
            };
            fs.writeJSON('./webapp/manifest.json', testManifest);
            // Call updateManifest
            await updateManifest('./', service, fs);
            const manifestJson = fs.readJSON('./webapp/manifest.json');
            expect(manifestJson).toEqual(expectedCdsManifest);
        });
    });

    describe('deleteServiceFromManifest', () => {
        let fs: Editor;
        beforeEach(async () => {
            fs = create(createStorage());
        });
        describe('deleteServiceFromManifest', () => {
            test('Ensure all references for service are deleted in edmx projects', async () => {
                const metadaPath = './webapp/localService/mainService/metadata.xml';
                const testManifest = {
                    'sap.app': {
                        id: 'test.update.manifest',
                        dataSources: {
                            mainService: {
                                uri: '/sap/opu/odata/sap/SEPMRA_PROD_MAN/',
                                type: 'OData',
                                settings: {
                                    annotations: [],
                                    localUri: 'localService/mainService/metadata.xml',
                                    odataVersion: '2.0'
                                }
                            }
                        }
                    },
                    'sap.ui5': {
                        models: {
                            '': {
                                dataSource: 'mainService',
                                preload: true,
                                settings: {}
                            }
                        }
                    }
                };
                const service: OdataService = {
                    name: 'mainService',
                    version: OdataVersion.v4
                };
                fs.writeJSON('./webapp/manifest.json', testManifest);
                fs.writeJSON(metadaPath, '');
                // Call deleteServiceFromManifest
                await deleteServiceData('./', {}, service, fs);
                const manifestJson = fs.readJSON('./webapp/manifest.json') as Partial<Manifest>;
                expect(manifestJson?.['sap.app']?.dataSources).toEqual({});
                expect(manifestJson?.['sap.ui5']?.models).toEqual({});
                // Metadata file for dataSource should be deleted as well
                expect(fs.exists(metadaPath)).toBeFalsy();
            });

            test('Ensure all references for service with multiple annotations are deleted in edmx projects', async () => {
                const metadaPath = './webapp/localService/mainService/metadata.xml';
                const testManifest = {
                    'sap.app': {
                        id: 'test.update.manifest',
                        dataSources: {
                            mainService: {
                                uri: '/sap/opu/odata/sap/SEPMRA_PROD_MAN/',
                                type: 'OData',
                                settings: {
                                    annotations: ['SEPMRA_PROD_MAN', 'annotation'],
                                    localUri: 'localService/mainService/metadata.xml',
                                    odataVersion: '2.0'
                                }
                            },
                            SEPMRA_PROD_MAN: {
                                uri: `/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/Annotations(TechnicalName='SEPMRA_PROD_MAN',Version='0001')/$value/`,
                                type: 'ODataAnnotation',
                                settings: {
                                    localUri: 'localService/SEPMRA_PROD_MAN.xml'
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
                                settings: {}
                            }
                        }
                    }
                };
                const service: OdataService = {
                    name: 'mainService',
                    version: OdataVersion.v4
                };
                fs.writeJSON('./webapp/manifest.json', testManifest);
                fs.writeJSON(metadaPath, '');
                // Call deleteServiceFromManifest
                await deleteServiceData('./', {}, service, fs);
                const manifestJson = fs.readJSON('./webapp/manifest.json') as Partial<Manifest>;
                expect(manifestJson?.['sap.app']?.dataSources).toEqual({
                    annotation: {
                        type: 'ODataAnnotation',
                        uri: 'annotations/annotation.xml',
                        settings: {
                            localUri: 'annotations/annotation.xml'
                        }
                    }
                });
                expect(manifestJson?.['sap.ui5']?.models).toEqual({});
                // Metadata file for dataSource should be deleted as well
                expect(fs.exists(metadaPath)).toBeFalsy();
            });

            test('Ensure other services are not deleted in edmx projects', async () => {
                const metadaPath = './webapp/localService/mainService/metadata.xml';
                const testManifest = {
                    'sap.app': {
                        id: 'test.update.manifest',
                        dataSources: {
                            mainService: {
                                uri: '/sap/opu/odata/sap/SEPMRA_PROD_MAN/',
                                type: 'OData',
                                settings: {
                                    annotations: [],
                                    localUri: 'localService/mainService/metadata.xml',
                                    odataVersion: '2.0'
                                }
                            }
                        }
                    },
                    'sap.ui5': {
                        models: {
                            '': {
                                dataSource: 'mainService',
                                preload: true,
                                settings: {}
                            }
                        }
                    }
                };
                const service: OdataService = {
                    name: 'dummyService',
                    version: OdataVersion.v4
                };
                fs.writeJSON('./webapp/manifest.json', testManifest);
                fs.writeJSON(metadaPath, '');
                // Call deleteServiceFromManifest
                await deleteServiceData('./', {}, service, fs);
                const manifestJson = fs.readJSON('./webapp/manifest.json');
                expect(manifestJson).toEqual(testManifest);
                // Metadata files for other services should not be deleted as well
                expect(fs.exists(metadaPath)).toBeTruthy();
            });
        });
    });
});
