import { join } from 'path';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import * as projectAccessMock from '@sap-ux/project-access';
import { checkCdsUi5PluginEnabled, enabledCdsUi5Plugin } from '../../../src//cap-config';

const fixturesPath = join(__dirname, '../../fixture');

describe('Test enabledCdsUi5Plugin()', () => {
    test('Empty project', async () => {
        const fs = await enabledCdsUi5Plugin(__dirname);
        const packageJson = fs.readJSON(join(__dirname, 'package.json'));
        expect(packageJson).toEqual({
            'dependencies': {
                '@sap/cds': '^6.8.2'
            },
            'workspaces': ['app/*'],
            'devDependencies': {
                'cds-plugin-ui5': 'latest'
            }
        });
    });

    test('Project with missing dependencies', async () => {
        const fs = await enabledCdsUi5Plugin(join(fixturesPath, 'cap-no-cds-plugin-ui'));
        const packageJson = fs.readJSON(join(fixturesPath, 'cap-no-cds-plugin-ui/package.json'));
        expect(packageJson).toEqual({
            'dependencies': {
                '@sap/cds': '^6.8.2'
            },
            'workspaces': ['app/*'],
            'devDependencies': {
                'cds-plugin-ui5': 'latest'
            }
        });
    });

    test('CAP with custom app path and mem-fs editor', async () => {
        jest.spyOn(projectAccessMock, 'getCapCustomPaths').mockResolvedValueOnce({
            app: 'customAppPath',
            db: 'db',
            srv: 'srv'
        });
        const memFs = create(createStorage());
        const fs = await enabledCdsUi5Plugin(__dirname, memFs);
        const packageJson = fs.readJSON(join(__dirname, 'package.json')) as projectAccessMock.Package;
        expect(packageJson.workspaces).toEqual(['customAppPath/*']);
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
            dependency: { '@sap/cds': '6.8.2' },
            devDependency: { 'cds-plugin-ui5': '0.0.1' },
            workspaces: []
        });
        expect(await checkCdsUi5PluginEnabled(__dirname, memFs)).toBe(false);
    });
});
