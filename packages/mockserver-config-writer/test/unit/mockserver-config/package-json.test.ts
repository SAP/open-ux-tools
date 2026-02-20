import { join } from 'node:path';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import type { Editor } from 'mem-fs-editor';
import type { Package } from '@sap-ux/project-access';
import { enhancePackageJson, removeFromPackageJson } from '../../../src/mockserver-config/package-json';

const basePath = join('/');
const packageJsonPath = join(basePath, 'package.json');

describe('Test for start-mock script in package.json', () => {
    test('Add new start-mock script to package.json', () => {
        const fs = getMockFsPackageJson();
        enhancePackageJson(fs, basePath);
        const startMock = (fs.readJSON(packageJsonPath) as Package).scripts?.['start-mock'];
        expect(startMock).toBe(`fiori run --config ./ui5-mock.yaml --open \"/\"`);
    });

    test(`Start script exists, but does not contain 'fiori run' command`, () => {
        const fs = getMockFsPackageJson('any other start script');
        enhancePackageJson(fs, basePath);
        const startMock = (fs.readJSON(packageJsonPath) as Package).scripts?.['start-mock'];
        expect(startMock).toBe(`fiori run --config ./ui5-mock.yaml --open \"/\"`);
    });

    test('Copy basic start script from package.json', () => {
        const fs = getMockFsPackageJson('fiori run');
        enhancePackageJson(fs, basePath);
        const startMock = (fs.readJSON(packageJsonPath) as Package).scripts?.['start-mock'];
        expect(startMock).toBe('fiori run --config ./ui5-mock.yaml');
    });

    test('Copy start script with --config', () => {
        const fs = getMockFsPackageJson('fiori run --config .');
        enhancePackageJson(fs, basePath);
        const startMock = (fs.readJSON(packageJsonPath) as Package).scripts?.['start-mock'];
        expect(startMock).toBe('fiori run --config ./ui5-mock.yaml');
    });

    test('Copy start script with --config and apostrophe path', () => {
        const fs = getMockFsPackageJson("fiori run --config     'path/with/a postrophe/any.yaml'  ");
        enhancePackageJson(fs, basePath);
        const startMock = (fs.readJSON(packageJsonPath) as Package).scripts?.['start-mock'];
        expect(startMock).toBe('fiori run --config ./ui5-mock.yaml  ');
    });

    test('Copy start script that contains multiple --config and path with space from package.json', () => {
        const fs = getMockFsPackageJson(
            'any --config before && fiori run --open "folder/file.html?some-param=value#frag-ment" --config "ui5 .yaml" --other arg'
        );
        enhancePackageJson(fs, basePath);
        const startMock = (fs.readJSON(packageJsonPath) as Package).scripts?.['start-mock'];
        expect(startMock).toBe(
            'any --config before && fiori run --open "folder/file.html?some-param=value#frag-ment" --config ./ui5-mock.yaml --other arg'
        );
    });

    function getMockFsPackageJson(startScript?: string, startMockScript?: string): Editor {
        const fs = create(createStorage());
        const packageJson: Package = {};
        if (startScript) {
            packageJson.scripts ||= {};
            packageJson.scripts['start'] = startScript;
        }
        if (startMockScript) {
            packageJson.scripts ||= {};
            packageJson.scripts['start-mock'] = startMockScript;
        }
        fs.writeJSON(packageJsonPath, packageJson);
        return fs;
    }
});

describe('Test for mockserver dependencies in package.json', () => {
    test('Add mockserver dependencies to empty package.json', () => {
        const fs = getMockFsPackageJson();
        enhancePackageJson(fs, basePath);
        const packageJson = fs.readJSON(packageJsonPath) as Package;
        expect(packageJson.devDependencies).toEqual({ '@sap-ux/ui5-middleware-fe-mockserver': '2' });
        expect(packageJson.ui5?.dependencies).toEqual(['@sap-ux/ui5-middleware-fe-mockserver']);
    });

    test('Custom mockserver dependencies to empty package.json', () => {
        const fs = getMockFsPackageJson();
        enhancePackageJson(fs, basePath, { mockserverModule: 'dummy-mockserver', mockserverVersion: '1.2.3' });
        const packageJson = fs.readJSON(packageJsonPath) as Package;
        expect(packageJson.devDependencies).toEqual({ 'dummy-mockserver': '1.2.3' });
        expect(packageJson.ui5?.dependencies).toEqual(['dummy-mockserver']);
    });

    test('Add mockserver dependencies while removing legacy dependencies in package.json', () => {
        const fs = getMockFsPackageJson(
            {
                '@sap/ux-ui5-fe-mockserver-middleware': '3.2.1',
                'other-dep': '9.9.9'
            },
            {
                dependencies: ['@sap/ux-ui5-fe-mockserver-middleware', 'other-dep']
            }
        );
        enhancePackageJson(fs, basePath);
        const packageJson = fs.readJSON(packageJsonPath) as Package;
        expect(packageJson.devDependencies).toEqual({
            'other-dep': '9.9.9',
            '@sap-ux/ui5-middleware-fe-mockserver': '2'
        });
        expect(packageJson.ui5?.dependencies).toEqual(['other-dep', '@sap-ux/ui5-middleware-fe-mockserver']);
    });

    test('Add mockserver dependency to package.json where @ui5/cli version 2 is used, should add ui5 dependencies', () => {
        const fs = getMockFsPackageJson({
            '@ui5/cli': '^2'
        });
        enhancePackageJson(fs, basePath);
        const packageJson = fs.readJSON(packageJsonPath) as Package;
        expect(packageJson.ui5?.dependencies).toEqual(['@sap-ux/ui5-middleware-fe-mockserver']);
    });

    test('Add mockserver dependency to package.json where @ui5/cli > 2 is used, should remove ui5 dependencies', () => {
        const fs = getMockFsPackageJson(
            {
                '@ui5/cli': '3.2.1'
            },
            {
                dependencies: ['@sap/ux-ui5-fe-mockserver-middleware', '@sap-ux/ui5-middleware-fe-mockserver']
            }
        );
        enhancePackageJson(fs, basePath);
        const packageJson = fs.readJSON(packageJsonPath) as Package;
        expect(packageJson.ui5).toBeUndefined();
    });

    test('Add mockserver dependency to package.json where @ui5/cli version is non-parsable, should add ui5 dependencies', () => {
        const fs = getMockFsPackageJson({
            '@ui5/cli': 'non-parsable'
        });
        enhancePackageJson(fs, basePath);
        const packageJson = fs.readJSON(packageJsonPath) as Package;
        expect(packageJson.ui5?.dependencies).toEqual(['@sap-ux/ui5-middleware-fe-mockserver']);
    });

    function getMockFsPackageJson(devDependencies?: any, ui5?: any): Editor {
        const fs = create(createStorage());
        const packageJson: Package = {};
        if (devDependencies) {
            packageJson.devDependencies = devDependencies;
        }
        if (ui5) {
            packageJson.ui5 = ui5;
        }
        fs.writeJSON(packageJsonPath, packageJson);
        return fs;
    }
});

describe('Remove mockserver from package.json', () => {
    test('Remove mockserver config from package.json', () => {
        const fs = getMockFsPackageJson({
            scripts: { 'start': 'start app', 'start-mock': 'start mockserver' },
            devDependencies: {
                '@sap/ux-ui5-fe-mockserver-middleware': '3.2.1',
                '@sap-ux/ui5-middleware-fe-mockserver': '1.2.3',
                'other-dep': '1.1.1'
            },
            ui5: {
                dependencies: [
                    '@sap/ux-ui5-fe-mockserver-middleware',
                    '@sap-ux/ui5-middleware-fe-mockserver',
                    'other-dep'
                ]
            }
        });
        removeFromPackageJson(fs, basePath);
        expect(fs.readJSON(packageJsonPath)).toEqual({
            scripts: { 'start': 'start app' },
            devDependencies: { 'other-dep': '1.1.1' },
            ui5: {
                dependencies: ['other-dep']
            }
        });
    });

    test('Remove from empty package.json, should do nothing', () => {
        const fs = getMockFsPackageJson();
        removeFromPackageJson(fs, basePath);
        expect(fs.readJSON(packageJsonPath)).toEqual({});
    });

    function getMockFsPackageJson(content?: any): Editor {
        const fs = create(createStorage());
        const packageJson: Package = content || {};
        fs.writeJSON(packageJsonPath, packageJson);
        return fs;
    }
});
