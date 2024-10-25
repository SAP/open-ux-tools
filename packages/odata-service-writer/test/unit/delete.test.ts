import { deleteServiceFromManifest } from '../../src/delete';
import type { Editor } from 'mem-fs-editor';
import { create } from 'mem-fs-editor';
import { create as createStorage } from 'mem-fs';

describe('delete', () => {
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

            fs.writeJSON('./webapp/manifest.json', testManifest);
            fs.writeJSON(metadaPath, '');
            // Call deleteServiceFromManifest
            await deleteServiceFromManifest('./', 'mainService', fs);
            const manifestJson = fs.readJSON('./webapp/manifest.json') as any;
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

            fs.writeJSON('./webapp/manifest.json', testManifest);
            fs.writeJSON(metadaPath, '');
            // Call deleteServiceFromManifest
            await deleteServiceFromManifest('./', 'mainService', fs);
            const manifestJson = fs.readJSON('./webapp/manifest.json') as any;
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

            fs.writeJSON('./webapp/manifest.json', testManifest);
            fs.writeJSON(metadaPath, '');
            // Call deleteServiceFromManifest
            await deleteServiceFromManifest('./', 'dummyService', fs);
            const manifestJson = fs.readJSON('./webapp/manifest.json');
            expect(manifestJson).toEqual(testManifest);
            // Metadata files for other services should not be deleted as well
            expect(fs.exists(metadaPath)).toBeTruthy();
        });
    });
});
