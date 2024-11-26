import { deleteServiceFromManifest, removeAnnotationsFromCDSFiles, removeAnnotationXmlFiles } from '../../src/delete';
import type { Editor } from 'mem-fs-editor';
import { create } from 'mem-fs-editor';
import { create as createStorage } from 'mem-fs';
import { dirname, join } from 'path';
import type { CdsAnnotationsInfo } from '../../src';
import { updateCdsFilesWithAnnotations } from '../../src/updates';

describe('removeAnnotationsFromCDSFiles', () => {
    let fs: Editor;
    beforeEach(async () => {
        fs = create(createStorage());
    });
    it('removes from annotation cds files correctly', async () => {
        const annotationsInfo: CdsAnnotationsInfo = {
            cdsFileContents: '"using AdminService as service from \'../../srv/admin-service\';"',
            projectPath: 'testProject',
            appPath: 'webapp',
            projectName: 'annotations'
        };
        const annotationPath = join('./testProject/webapp/annotations', 'annotations.cds');

        // Write annotation file
        await updateCdsFilesWithAnnotations(annotationsInfo, fs);
        let annotationCds = fs.read(annotationPath);
        expect(annotationCds).toEqual(annotationsInfo.cdsFileContents);

        // Remove from annotation file
        await removeAnnotationsFromCDSFiles(annotationsInfo, fs);
        annotationCds = fs.read(annotationPath);
        expect(annotationCds).toEqual('');

        // Convert the annotation path to the services path
        const serviceCdsPath = join(dirname(annotationPath).replace('annotations', ''), 'services.cds');
        const serviceCds = fs.read(serviceCdsPath);
        expect(serviceCds).not.toContain(`using from './annotations/annotations';`);
    });

    it('removes from annotations cds files correctly for multiple annotations', async () => {
        const annotationsInfo: CdsAnnotationsInfo[] = [
            {
                cdsFileContents: '"using AdminService as service from \'../../srv/admin-service\';"',
                projectPath: 'testProject',
                appPath: 'webapp',
                projectName: 'annotations'
            },
            {
                cdsFileContents: '"using IncidentService as service from \'../../srv/incidentservice\';"',
                projectPath: 'testProject',
                appPath: 'webapp',
                projectName: 'annotations'
            }
        ];
        const annotationsPath = join('./testProject/webapp/annotations', 'annotations.cds');

        // Write annotation file
        await updateCdsFilesWithAnnotations(annotationsInfo, fs);
        let annotationCds = fs.read(annotationsPath);
        expect(annotationCds).toContain(annotationsInfo[0].cdsFileContents);
        expect(annotationCds).toContain(annotationsInfo[1].cdsFileContents);

        // Remove from annotation file
        await removeAnnotationsFromCDSFiles(annotationsInfo, fs);
        annotationCds = fs.read(annotationsPath);
        expect(annotationCds).not.toContain(annotationsInfo[0].cdsFileContents);
        expect(annotationCds).not.toContain(annotationsInfo[1].cdsFileContents);

        // Convert the annotation path to the services path
        const serviceCdsPath = join(dirname(annotationsPath).replace('annotations', ''), 'services.cds');
        const serviceCds = fs.read(serviceCdsPath);
        expect(serviceCds).not.toContain(`using from './annotations/annotations';`);
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

            fs.writeJSON('./webapp/manifest.json', testManifest);
            fs.writeJSON(metadaPath, '');
            // Call deleteServiceFromManifest
            deleteServiceFromManifest('./', 'mainService', fs);
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
            deleteServiceFromManifest('./', 'mainService', fs);
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
            deleteServiceFromManifest('./', 'dummyService', fs);
            const manifestJson = fs.readJSON('./webapp/manifest.json');
            expect(manifestJson).toEqual(testManifest);
            // Metadata files for other services should not be deleted as well
            expect(fs.exists(metadaPath)).toBeTruthy();
        });
    });
});

describe('removeAnnotationXmlFiles', () => {
    let fs: Editor;
    beforeEach(async () => {
        fs = create(createStorage());
    });

    it('removes service annotations', async () => {
        const serviceAnnotationPath = join('', 'webapp', 'localService', 'mainService', 'annotation1.xml');
        fs.write(serviceAnnotationPath, '<?xml version="1.0" encoding="utf-8"?></edmx:Edmx>');
        const differentServiceAnnotationPath = join(
            '',
            'webapp',
            'localService',
            'differentService',
            'annotation1.xml'
        );
        fs.write(differentServiceAnnotationPath, '<?xml version="1.0" encoding="utf-8"?></edmx:Edmx>');
        await removeAnnotationXmlFiles(fs, '', 'mainService', [
            {
                name: 'annotation1',
                technicalName: 'annotation1',
                xml: '<?xml version="1.0" encoding="utf-8"?></edmx:Edmx>'
            }
        ]);
        expect(fs.exists(serviceAnnotationPath)).toBe(false);
        expect(fs.exists(differentServiceAnnotationPath)).toBe(true);
    });
});
