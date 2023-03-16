import type { Package } from '@sap-ux/project-access';
import * as ejs from 'ejs';
import { create as createStorage } from 'mem-fs';
import type { Editor } from 'mem-fs-editor';
import { create } from 'mem-fs-editor';
import { join } from 'path';
import type { OdataService } from '../../src';
import { OdataVersion } from '../../src';
import { updateManifest, updatePackageJson } from '../../src/updates';

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
});
