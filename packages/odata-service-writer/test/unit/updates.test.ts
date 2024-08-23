import { updateManifest, updatePackageJson, updateCdsFilesWithAnnotations } from '../../src/updates';
import path, { join } from 'path';
import type { Editor } from 'mem-fs-editor';
import { create } from 'mem-fs-editor';
import { create as createStorage } from 'mem-fs';
import type { OdataService, CdsAnnotationsInfo } from '../../src';
import { OdataVersion, ServiceType } from '../../src';
import * as ejs from 'ejs';
import { expectedEdmxManifest } from '../test-data/manifest-json/edmx-manifest';
import { expectedCdsManifest } from '../test-data/manifest-json/cap-manifest';
import type { Package } from '@sap-ux/project-access';

jest.mock('ejs', () => ({
    __esModule: true, // Allows mocking of ejs funcs
    ...(jest.requireActual('ejs') as {})
}));

describe('updates', () => {
    let fs: Editor;
    beforeEach(async () => {
        fs = create(createStorage());
    });

    describe('updateManifest', () => {
        test('Ensure OdataService properties are not interpretted as ejs render options', () => {
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
                path: '/a/path'
            };

            fs.writeJSON('./webapp/manifest.json', testManifest);
            const ejsMock = jest.spyOn(ejs, 'render');
            updateManifest('./', service, fs, join(__dirname, '../../templates'));
            // Passing empty options prevents ejs interpretting OdataService properties as ejs options
            expect(ejsMock).toHaveBeenCalledWith(expect.anything(), service, {});
        });
        test.each([
            ['1.110.0', true],
            ['1.115.0', true],
            ['', false],
            ['1.105.0', false],
            [undefined, false],
            [['1.120.10', '2.0.0'], true]
        ])('Ensure synchronizationMode is correctly set for minUI5Version %s', (minUI5Version, syncMode) => {
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
            const ejsMock = jest.spyOn(ejs, 'render');

            // Call updateManifest
            updateManifest('./', service, fs, join(__dirname, '../../templates'));

            expect(ejsMock).toHaveBeenCalledWith(
                expect.anything(),
                { ...service, includeSynchronizationMode: syncMode },
                {}
            );
        });
        test('Ensure manifest updates are updated as expected as in edmx projects', () => {
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
            updateManifest('./', service, fs, join(__dirname, '../../templates'));
            const manifestJson = fs.readJSON('./webapp/manifest.json');
            expect(manifestJson).toEqual(expectedEdmxManifest);
        });

        test('Ensure manifest updates are updated as expected as in cds projects', () => {
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
            updateManifest('./', service, fs, join(__dirname, '../../templates'));
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
    });
});
