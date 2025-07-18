import { join } from 'path';
import type { Editor } from 'mem-fs-editor';
import { create } from 'mem-fs-editor';
import { create as createStorage } from 'mem-fs';
import type { Package } from '@sap-ux/project-access';
import { updatePackageJson } from '../../src/data/package';

describe('package', () => {
    let fs: Editor;
    beforeEach(async () => {
        fs = create(createStorage());
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
