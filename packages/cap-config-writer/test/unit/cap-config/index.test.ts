import { promises } from 'fs';
import { join } from 'path';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import * as projectAccessMock from '@sap-ux/project-access';
import { checkCdsUi5PluginEnabled, enableCdsUi5Plugin } from '../../../src//cap-config';
import { hasMinCdsVersion } from '../../../src/cap-config/package-json';
import type { Package } from '@sap-ux/project-access';

const fixturesPath = join(__dirname, '../../fixture');

describe('Test enableCdsUi5Plugin()', () => {
    test('Empty project', async () => {
        const fs = await enableCdsUi5Plugin(__dirname);
        const packageJson = fs.readJSON(join(__dirname, 'package.json'));
        expect(packageJson).toEqual({
            'dependencies': {
                '@sap/cds': '^6.8.2'
            },
            'workspaces': ['app/*'],
            'devDependencies': {
                'cds-plugin-ui5': '^0.1.1'
            }
        });
    });

    test('Enable on project that has already enabled, should not change anything', async () => {
        const fs = await enableCdsUi5Plugin(join(fixturesPath, 'cap-valid-cds-plugin-ui'));
        const originalPackageJson = JSON.parse(
            (await promises.readFile(join(fixturesPath, 'cap-valid-cds-plugin-ui/package.json'))).toString()
        );
        expect(fs.readJSON(join(fixturesPath, 'cap-valid-cds-plugin-ui/package.json'))).toEqual(originalPackageJson);
    });

    test('Project with missing dependencies', async () => {
        const fs = await enableCdsUi5Plugin(join(fixturesPath, 'cap-no-cds-plugin-ui'));
        const packageJson = fs.readJSON(join(fixturesPath, 'cap-no-cds-plugin-ui/package.json'));
        expect(packageJson).toEqual({
            'dependencies': {
                '@sap/cds': '^6.8.2'
            },
            'workspaces': ['app/*'],
            'devDependencies': {
                'cds-plugin-ui5': '^0.1.1'
            }
        });
    });

    test('Project with missing devDependencies, pass mem-fs editor', async () => {
        const memFs = create(createStorage());
        memFs.writeJSON(join(__dirname, 'package.json'), {
            dependencies: { '@sap/cds': '6.8.2' },
            devDependencies: {},
            workspaces: ['app/*']
        });
        const fs = await enableCdsUi5Plugin(__dirname, memFs);
        const packageJson = fs.readJSON(join(__dirname, 'package.json')) as projectAccessMock.Package;
        expect(packageJson.devDependencies).toEqual({ 'cds-plugin-ui5': '^0.1.1' });
    });

    test('CAP with custom app path and mem-fs editor', async () => {
        jest.spyOn(projectAccessMock, 'getCapCustomPaths').mockResolvedValueOnce({
            app: 'customAppPath',
            db: 'db',
            srv: 'srv'
        });
        const memFs = create(createStorage());
        const fs = await enableCdsUi5Plugin(__dirname, memFs);
        const packageJson = fs.readJSON(join(__dirname, 'package.json')) as projectAccessMock.Package;
        expect(packageJson.workspaces).toEqual(['customAppPath/*']);
    });

    test('CAP with yarn workspace but missing app folder', async () => {
        const memFs = create(createStorage());
        memFs.writeJSON(join(__dirname, 'package.json'), { workspaces: {} });
        await enableCdsUi5Plugin(__dirname, memFs);
        const packageJson = memFs.readJSON(join(__dirname, 'package.json')) as projectAccessMock.Package;
        expect(packageJson.workspaces).toEqual({
            packages: ['app/*']
        });
    });
});

describe('Test checkCdsUi5PluginEnabled()', () => {
    test('Empty project should return false', async () => {
        expect(await checkCdsUi5PluginEnabled(__dirname)).toBe(false);
    });

    test('CAP project with valid cds-plugin-ui', async () => {
        expect(await checkCdsUi5PluginEnabled(join(fixturesPath, 'cap-valid-cds-plugin-ui'))).toBe(true);
    });

    test('CAP project with missing apps folder in workspaces', async () => {
        const memFs = create(createStorage());
        memFs.writeJSON(join(__dirname, 'package.json'), {
            dependencies: { '@sap/cds': '6.8.2' },
            devDependencies: { 'cds-plugin-ui5': '0.0.1' },
            workspaces: []
        });
        expect(await checkCdsUi5PluginEnabled(__dirname, memFs)).toBe(false);
    });

    test('CAP project with workspaces config as object, but no apps folder', async () => {
        const memFs = create(createStorage());
        memFs.writeJSON(join(__dirname, 'package.json'), {
            dependencies: { '@sap/cds': '6.8.2' },
            devDependencies: { 'cds-plugin-ui5': '0.0.1' },
            workspaces: {}
        });
        expect(await checkCdsUi5PluginEnabled(__dirname, memFs)).toBe(false);
    });

    test('CAP project with workspaces config as object, app folder in workspace', async () => {
        const memFs = create(createStorage());
        memFs.writeJSON(join(__dirname, 'package.json'), {
            dependencies: { '@sap/cds': '6.8.2' },
            devDependencies: { 'cds-plugin-ui5': '0.0.1' },
            workspaces: {
                packages: ['app/*']
            }
        });
        expect(await checkCdsUi5PluginEnabled(__dirname, memFs)).toBe(true);
    });
});

describe('Test hasMinCdsVersion()', () => {
    test('CAP project with valid @sap/cds version using caret(^)', async () => {
        const memFs = create(createStorage());
        memFs.writeJSON(join(__dirname, 'package.json'), {
            dependencies: { '@sap/cds': '^6.7.0' }
        });
        const packageJson: Package = (memFs.readJSON(join(__dirname, 'package.json')) ?? {}) as Package;
        expect(hasMinCdsVersion(packageJson)).toBe(false);
    });

    test('CAP project with invalid @sap/cds version using caret(^)', async () => {
        const memFs = create(createStorage());
        memFs.writeJSON(join(__dirname, 'package.json'), {
            dependencies: { '@sap/cds': '^4' }
        });
        const packageJson: Package = (memFs.readJSON(join(__dirname, 'package.json')) ?? {}) as Package;
        expect(hasMinCdsVersion(packageJson)).toBe(false);
    });

    test('CAP project with valid @sap/cds version using x-range', async () => {
        const memFs = create(createStorage());
        memFs.writeJSON(join(__dirname, 'package.json'), {
            dependencies: { '@sap/cds': '6.x' }
        });
        const packageJson: Package = (memFs.readJSON(join(__dirname, 'package.json')) ?? {}) as Package;
        expect(hasMinCdsVersion(packageJson)).toBe(false);
    });

    test('CAP project with invalid @sap/cds version using x-range', async () => {
        const memFs = create(createStorage());
        memFs.writeJSON(join(__dirname, 'package.json'), {
            dependencies: { '@sap/cds': '4.x' }
        });
        const packageJson: Package = (memFs.readJSON(join(__dirname, 'package.json')) ?? {}) as Package;
        expect(hasMinCdsVersion(packageJson)).toBe(false);
    });

    test('CAP project with valid @sap/cds version using greater than (>)', async () => {
        const memFs = create(createStorage());
        memFs.writeJSON(join(__dirname, 'package.json'), {
            dependencies: { '@sap/cds': '>4.0.0' }
        });
        const packageJson: Package = (memFs.readJSON(join(__dirname, 'package.json')) ?? {}) as Package;
        expect(hasMinCdsVersion(packageJson)).toBe(false);
    });

    test('CAP project with invalid @sap/cds version containing semver with letters', async () => {
        const memFs = create(createStorage());
        memFs.writeJSON(join(__dirname, 'package.json'), {
            dependencies: { '@sap/cds': 'a.b.c' }
        });
        const packageJson: Package = (memFs.readJSON(join(__dirname, 'package.json')) ?? {}) as Package;
        expect(hasMinCdsVersion(packageJson)).toBe(false);
    });

    test('CAP project with invalid @sap/cds version containing text', async () => {
        const memFs = create(createStorage());
        memFs.writeJSON(join(__dirname, 'package.json'), {
            dependencies: { '@sap/cds': 'test' }
        });
        const packageJson: Package = (memFs.readJSON(join(__dirname, 'package.json')) ?? {}) as Package;
        expect(hasMinCdsVersion(packageJson)).toBe(false);
    });

    test('CAP project with valid @sap/cds version using higher version', async () => {
        const memFs = create(createStorage());
        memFs.writeJSON(join(__dirname, 'package.json'), {
            dependencies: { '@sap/cds': '6.8.4' }
        });
        const packageJson: Package = (memFs.readJSON(join(__dirname, 'package.json')) ?? {}) as Package;
        expect(hasMinCdsVersion(packageJson)).toBe(true);
    });

    test('CAP project with valid @sap/cds version using higher version with caret (^)', async () => {
        const memFs = create(createStorage());
        memFs.writeJSON(join(__dirname, 'package.json'), {
            dependencies: { '@sap/cds': '^7' }
        });
        const packageJson: Package = (memFs.readJSON(join(__dirname, 'package.json')) ?? {}) as Package;
        expect(hasMinCdsVersion(packageJson)).toBe(true);
    });
});

describe('Test hasMinCdsVersion() including ranges', () => {
    test('CAP project with valid @sap/cds version using caret(^)', async () => {
        const memFs = create(createStorage());
        memFs.writeJSON(join(__dirname, 'package.json'), {
            dependencies: { '@sap/cds': '^6.7.0' }
        });
        const packageJson: Package = (memFs.readJSON(join(__dirname, 'package.json')) ?? {}) as Package;
        expect(hasMinCdsVersion(packageJson, true)).toBe(true);
    });

    test('CAP project with invalid @sap/cds version using caret(^)', async () => {
        const memFs = create(createStorage());
        memFs.writeJSON(join(__dirname, 'package.json'), {
            dependencies: { '@sap/cds': '^4' }
        });
        const packageJson: Package = (memFs.readJSON(join(__dirname, 'package.json')) ?? {}) as Package;
        expect(hasMinCdsVersion(packageJson, true)).toBe(false);
    });

    test('CAP project with valid @sap/cds version using x-range', async () => {
        const memFs = create(createStorage());
        memFs.writeJSON(join(__dirname, 'package.json'), {
            dependencies: { '@sap/cds': '6.x' }
        });
        const packageJson: Package = (memFs.readJSON(join(__dirname, 'package.json')) ?? {}) as Package;
        expect(hasMinCdsVersion(packageJson, true)).toBe(true);
    });

    test('CAP project with invalid @sap/cds version using x-range', async () => {
        const memFs = create(createStorage());
        memFs.writeJSON(join(__dirname, 'package.json'), {
            dependencies: { '@sap/cds': '4.x' }
        });
        const packageJson: Package = (memFs.readJSON(join(__dirname, 'package.json')) ?? {}) as Package;
        expect(hasMinCdsVersion(packageJson, true)).toBe(false);
    });

    test('CAP project with valid @sap/cds version using greater than (>)', async () => {
        const memFs = create(createStorage());
        memFs.writeJSON(join(__dirname, 'package.json'), {
            dependencies: { '@sap/cds': '>4.0.0' }
        });
        const packageJson: Package = (memFs.readJSON(join(__dirname, 'package.json')) ?? {}) as Package;
        expect(hasMinCdsVersion(packageJson, true)).toBe(true);
    });

    test('CAP project with invalid @sap/cds version containing semver with letters', async () => {
        const memFs = create(createStorage());
        memFs.writeJSON(join(__dirname, 'package.json'), {
            dependencies: { '@sap/cds': 'a.b.c' }
        });
        const packageJson: Package = (memFs.readJSON(join(__dirname, 'package.json')) ?? {}) as Package;
        expect(hasMinCdsVersion(packageJson, true)).toBe(false);
    });

    test('CAP project with invalid @sap/cds version containing text', async () => {
        const memFs = create(createStorage());
        memFs.writeJSON(join(__dirname, 'package.json'), {
            dependencies: { '@sap/cds': 'test' }
        });
        const packageJson: Package = (memFs.readJSON(join(__dirname, 'package.json')) ?? {}) as Package;
        expect(hasMinCdsVersion(packageJson, true)).toBe(false);
    });

    test('CAP project with valid @sap/cds version using higher version', async () => {
        const memFs = create(createStorage());
        memFs.writeJSON(join(__dirname, 'package.json'), {
            dependencies: { '@sap/cds': '6.8.4' }
        });
        const packageJson: Package = (memFs.readJSON(join(__dirname, 'package.json')) ?? {}) as Package;
        expect(hasMinCdsVersion(packageJson, true)).toBe(true);
    });

    test('CAP project with valid @sap/cds version using higher version with caret (^)', async () => {
        const memFs = create(createStorage());
        memFs.writeJSON(join(__dirname, 'package.json'), {
            dependencies: { '@sap/cds': '^7' }
        });
        const packageJson: Package = (memFs.readJSON(join(__dirname, 'package.json')) ?? {}) as Package;
        expect(hasMinCdsVersion(packageJson, true)).toBe(true);
    });
});
