import { updateManifest, updatePackageJson, updateCdsFilesWithAnnotations } from '../../src/updates';
import path, { join } from 'path';
import type { Editor } from 'mem-fs-editor';
import { create } from 'mem-fs-editor';
import { create as createStorage } from 'mem-fs';
import type { OdataService, CdsAnnotationsInfo } from '../../src';
import { OdataVersion, ServiceType } from '../../src';
import { expectedEdmxManifest } from '../test-data/manifest-json/edmx-manifest';
import { expectedEdmxManifestMultipleAnnotations } from '../test-data/manifest-json/edmx-manifest-multiple-annotations';
import { expectedEdmxManifestMultipleServices } from '../test-data/manifest-json/edmx-manifest-multiple-services';
import { expectedEdmxManifestOlderServices } from '../test-data/manifest-json/edmx-manifest-older-services';
import { expectedCdsManifest } from '../test-data/manifest-json/cap-manifest';
import { expectedEdmxManifestLocalAnnotation } from '../test-data/manifest-json/edmx-manifest-local-annotation'; // single local annotation
import { expectedEdmxManifestLocalAnnotations } from '../test-data/manifest-json/edmx-manifest-local-annotations'; // multiple local annotations
import { expectedEdmxManifesNoAnnotations } from '../test-data/manifest-json/edmx-manifest-no-annotations'; // no any annotations
import type { Manifest, Package } from '@sap-ux/project-access';

describe('updates', () => {
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
        test('Ensure manifest updates are updated as expected as in edmx projects', async () => {
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

        test('Ensure manifest updates are updated as expected as in edmx projects with custom model settings', async () => {
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

        test('Ensure manifest updates are updated as expected as in edmx projects with local annotation', async () => {
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

        test('Ensure manifest updates are updated as expected as in edmx projects with multiple local annotations', async () => {
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

        test('Ensure manifest updates are updated as expected as in edmx projects without any annotations', async () => {
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

        test('Ensure manifest updates are updated as expected as in edmx projects with multiple annotations', async () => {
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

        test('Ensure manifest updates are updated as expected as in edmx projects with multiple services', async () => {
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

        test('Ensure manifest updates are updated as expected as in edmx projects with older services', async () => {
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

        test('Ensure manifest updates are updated as expected as in cds projects', async () => {
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

    describe('update package.json', () => {
        const packageJsonFile = 'package.json';
        const testPackageJson = {
            'devDependencies': {
                '@ui5/cli': ''
            },
            'ui5': {
                'dependencies': []
            }
        };
        test('Add @sap/ux-ui5-tooling dependency to ui5 if @ui5/cli version is less than 3.0.0', () => {
            testPackageJson.devDependencies['@ui5/cli'] = '^2.14.1';
            const path = join('./test1', packageJsonFile);
            fs.writeJSON(path, testPackageJson);
            updatePackageJson(path, fs, false);
            const packageJson = fs.readJSON('./test1/package.json') as Package;
            expect(packageJson.ui5?.dependencies).toEqual(['@sap/ux-ui5-tooling']);
        });

        test('Do not add @sap/ux-ui5-tooling dependency to ui5 if @ui5/cli version is 3.0.0 or greater', () => {
            testPackageJson.devDependencies['@ui5/cli'] = '^3.0.0';
            const path = join('./test2', packageJsonFile);
            fs.writeJSON(path, testPackageJson);
            updatePackageJson(path, fs, false);
            const packageJson = fs.readJSON('./test2/package.json') as Package;
            expect(packageJson.ui5?.dependencies).toEqual([]);
        });
    });

    describe('updates cds files correctly', () => {
        it('writes annotation cds files correctly', async () => {
            const annotationsInfo: CdsAnnotationsInfo = {
                cdsFileContents: '"using AdminService as service from \'../../srv/admin-service\';"',
                projectPath: 'testProject',
                appPath: 'webapp',
                projectName: 'annotations'
            };
            const annotationPath = join('./testProject/webapp/annotations', 'annotations.cds');
            await updateCdsFilesWithAnnotations(annotationsInfo, fs);
            const annotationCds = fs.read(annotationPath);
            expect(annotationCds).toEqual(annotationsInfo.cdsFileContents);
            // Convert the annotation path to the services path
            const serviceCdsPath = path.join(path.dirname(annotationPath).replace('annotations', ''), 'services.cds');
            const serviceCds = fs.read(serviceCdsPath);
            expect(serviceCds).toContain(`using from './annotations/annotations';`);
        });

        it('writes annotation cds files correctly for multiple annotations', async () => {
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
            await updateCdsFilesWithAnnotations(annotationsInfo, fs);
            const annotationCds = fs.read(annotationsPath);
            expect(annotationCds).toContain(annotationsInfo[0].cdsFileContents);
            expect(annotationCds).toContain(annotationsInfo[1].cdsFileContents);
            // Convert the annotation path to the services path
            const serviceCdsPath = path.join(path.dirname(annotationsPath).replace('annotations', ''), 'services.cds');
            const serviceCds = fs.read(serviceCdsPath);
            expect(serviceCds).toContain(`using from './annotations/annotations';`);
        });
    });
});
