import { promises } from 'fs';
import { join } from 'path';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import type { Package } from '@sap-ux/project-access';
import { enableCdsUi5Plugin } from '../../../src';
import * as ProjectAccessMock from '@sap-ux/project-access';

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
                'cds-plugin-ui5': '^0.13.0'
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
                'cds-plugin-ui5': '^0.13.0'
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
        const packageJson = fs.readJSON(join(__dirname, 'package.json')) as Package;
        expect(packageJson.devDependencies).toEqual({ 'cds-plugin-ui5': '^0.13.0' });
    });

    test('CAP with custom app path and mem-fs editor', async () => {
        jest.spyOn(ProjectAccessMock, 'hasMinCdsVersion').mockReturnValue(true);
        jest.spyOn(ProjectAccessMock, 'getWorkspaceInfo').mockResolvedValueOnce({
            appWorkspace: 'customAppPath/*',
            workspaceEnabled: false,
            workspacePackages: []
        });
        const memFs = create(createStorage());
        const fs = await enableCdsUi5Plugin(__dirname, memFs);
        const packageJson = fs.readJSON(join(__dirname, 'package.json')) as Package;
        expect(packageJson.workspaces).toEqual(['customAppPath/*']);
    });

    test('CAP with yarn workspace but missing app folder', async () => {
        const memFs = create(createStorage());
        memFs.writeJSON(join(__dirname, 'package.json'), { workspaces: {} });
        await enableCdsUi5Plugin(__dirname, memFs);
        const packageJson = memFs.readJSON(join(__dirname, 'package.json')) as Package;
        expect(packageJson.workspaces).toEqual({
            packages: ['app/*']
        });
    });
});
