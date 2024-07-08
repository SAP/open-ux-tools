import { promises } from 'fs';
import { join } from 'path';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import * as projectAccessMock from '@sap-ux/project-access';
import { checkCdsUi5PluginEnabled, enableCdsUi5Plugin } from '../../../src/cap-config';

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
                'cds-plugin-ui5': '^0.9.3'
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
                'cds-plugin-ui5': '^0.9.3'
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
        expect(packageJson.devDependencies).toEqual({ 'cds-plugin-ui5': '^0.9.3' });
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
        expect(await checkCdsUi5PluginEnabled(__dirname, undefined, true)).toBe(false);
    });

    test('CAP project with valid cds-plugin-ui', async () => {
        expect(await checkCdsUi5PluginEnabled(join(fixturesPath, 'cap-valid-cds-plugin-ui'))).toBe(true);
        expect(await checkCdsUi5PluginEnabled(join(fixturesPath, 'cap-valid-cds-plugin-ui'), undefined, true)).toEqual({
            hasCdsUi5Plugin: true,
            hasMinCdsVersion: true,
            isCdsUi5PluginEnabled: true,
            isWorkspaceEnabled: true
        });
    });

    test('CAP project with missing apps folder in workspaces', async () => {
        const memFs = create(createStorage());
        memFs.writeJSON(join(__dirname, 'package.json'), {
            dependencies: { '@sap/cds': '6.8.2' },
            devDependencies: { 'cds-plugin-ui5': '0.0.1' },
            workspaces: []
        });
        expect(await checkCdsUi5PluginEnabled(__dirname, memFs)).toBe(false);
        expect(await checkCdsUi5PluginEnabled(__dirname, memFs, true)).toEqual({
            hasCdsUi5Plugin: true,
            hasMinCdsVersion: true,
            isCdsUi5PluginEnabled: false,
            isWorkspaceEnabled: false
        });
    });

    test('CAP project with workspaces config as object, but no apps folder', async () => {
        const memFs = create(createStorage());
        memFs.writeJSON(join(__dirname, 'package.json'), {
            dependencies: { '@sap/cds': '6.8.2' },
            devDependencies: { 'cds-plugin-ui5': '0.0.1' },
            workspaces: {}
        });
        expect(await checkCdsUi5PluginEnabled(__dirname, memFs)).toBe(false);
        expect(await checkCdsUi5PluginEnabled(__dirname, memFs, true)).toEqual({
            hasCdsUi5Plugin: true,
            hasMinCdsVersion: true,
            isCdsUi5PluginEnabled: false,
            isWorkspaceEnabled: false
        });
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
        expect(await checkCdsUi5PluginEnabled(__dirname, memFs, true)).toEqual({
            hasCdsUi5Plugin: true,
            hasMinCdsVersion: true,
            isCdsUi5PluginEnabled: true,
            isWorkspaceEnabled: true
        });
    });

    test('CAP project with cds version info greater than minimum cds requirement', async () => {
        const memFs = create(createStorage());
        memFs.writeJSON(join(__dirname, 'package.json'), {
            dependencies: { '@sap/cds': '6.8.2' },
            devDependencies: { 'cds-plugin-ui5': '0.0.1' },
            workspaces: {
                packages: ['app/*']
            }
        });
        const cdsVersionInfo = {
            home: '/path',
            version: '7.7.2',
            root: '/path/root'
        };
        expect(await checkCdsUi5PluginEnabled(__dirname, memFs)).toBe(true);
        expect(await checkCdsUi5PluginEnabled(__dirname, memFs, true, cdsVersionInfo)).toEqual({
            hasCdsUi5Plugin: true,
            hasMinCdsVersion: true,
            isCdsUi5PluginEnabled: true,
            isWorkspaceEnabled: true
        });
    });
});
