import { basename, dirname, join } from 'path';
import type { WorkspaceFolder } from '../../src';
import { findAllApps, findProjectRoot, getAppRootFromWebappPath } from '../../src';

const testDataRoot = join(__dirname, '..', 'test-data');

describe('Test findAllApps()', () => {
    test('Find all apps from workspace', async () => {
        // Mock setup
        const testWs = {
            uri: {
                authority: '',
                fragment: '',
                fsPath: join(testDataRoot, 'project', 'find-all-apps'),
                path: `${__dirname}/project/find-all-apps`,
                query: '',
                scheme: 'file'
            }
        } as WorkspaceFolder;

        // Test execution
        const findResults = await findAllApps([testWs]);

        // Check for invalid apps
        const invalidApps = findResults.filter((m) => m.appRoot.includes('invalid'));
        expect(invalidApps).toEqual([]);

        // Check all expected apps found
        const expectedApps = [
            'single_apps-fiori_elements',
            'single_apps-freestyle',
            'single_apps-custom_webapp_fiori_elements',
            'single_apps-custom_webapp_freestyle',
            'CAPJava_fiori_elements-fiori_elements_no_package_json',
            'CAPJava_fiori_elements-fiori_elements',
            'CAPJava_freestyle-freestyle',
            'CAPJava_mix-fiori_elements',
            'CAPJava_mix-fiori_elements_no_package_json',
            'CAPJava_mix-freestyle',
            'CAPnode_fiori_elements-fiori_elements',
            'CAPnode_fiori_elements-fiori_elements_no_package_json',
            'CAPnode_freestyle-freestyle',
            'CAPnode_mix-fiori_elements',
            'CAPnode_mix-fiori_elements_no_package_json',
            'CAPnode_mix-freestyle'
        ];
        const foundApps = findResults.map((m) => m.manifest['sap.app'].id);
        const foundRoots = findResults.map((m) =>
            m.projectRoot === m.appRoot
                ? `${basename(dirname(m.projectRoot))}-${basename(m.appRoot)}`
                : `${basename(m.projectRoot)}-${basename(m.appRoot)}`
        );
        for (const expectedApp of expectedApps) {
            expect(foundApps).toContain(expectedApp);
            expect(foundRoots).toContain(expectedApp);
        }
        expect(expectedApps.length).toEqual(findResults.length);
    });

    test('Find all apps from path[]', async () => {
        // Mock setup
        const paths = [
            join(testDataRoot, 'project', 'find-all-apps', 'CAP', 'CAPnode_mix'),
            join(testDataRoot, 'project', 'find-all-apps', 'single_apps', 'fiori_elements')
        ];

        // Test execution
        const findResults = await findAllApps(paths);

        // Check for invalid apps
        const invalidApps = findResults.filter((m) => m.appRoot.includes('invalid'));
        expect(invalidApps).toEqual([]);

        // Check all expected apps found
        const expectedApps = [
            'CAPnode_mix-fiori_elements_no_package_json',
            'CAPnode_mix-freestyle',
            'CAPnode_mix-fiori_elements',
            'single_apps-fiori_elements'
        ];
        const foundApps = findResults.map((m) => m.manifest['sap.app'].id);
        const foundRoots = findResults.map((m) =>
            m.projectRoot === m.appRoot
                ? `${basename(dirname(m.projectRoot))}-${basename(m.appRoot)}`
                : `${basename(m.projectRoot)}-${basename(m.appRoot)}`
        );
        expect(expectedApps.length).toEqual(findResults.length);
        for (const expectedApp of expectedApps) {
            expect(foundApps).toContain(expectedApp);
            expect(foundRoots).toContain(expectedApp);
        }
    });
    test('Find all apps, no paths to search provided, should return empty array', async () => {
        // Test execution
        expect(await findAllApps(undefined)).toEqual([]);
    });
});

describe('Test findProjectRoot()', () => {
    test('No package.json, should throw error', async () => {
        try {
            await findProjectRoot(join('/'));
            fail('Function findProjectRoot() should have thrown error but did not.');
        } catch (error) {
            expect(error.toString()).toContain(join('/'));
        }
    });

    test('No package.json, sapuxRequired: false, should throw error', async () => {
        try {
            await findProjectRoot(join('/'), false);
            fail('Function findProjectRoot() should have thrown error but did not.');
        } catch (error) {
            expect(error.toString()).toContain(join('/'));
        }
    });

    test('Find root with sapux: true in package.json', async () => {
        const expectedProjectRoot = join(
            __dirname,
            '..',
            'test-data',
            'project',
            'find-all-apps',
            'single_apps',
            'fiori_elements'
        );
        const projectRoot = await findProjectRoot(join(expectedProjectRoot, 'webapp'));
        expect(projectRoot).toEqual(expectedProjectRoot);
    });

    test('Find root with sapux: true but package.json without sapux is in parent hierarchy', async () => {
        const expectedProjectRoot = join(
            __dirname,
            '..',
            'test-data',
            'project',
            'find-all-apps',
            'CAP',
            'CAPnode_fiori_elements'
        );
        const projectRoot = await findProjectRoot(
            join(expectedProjectRoot, 'app', 'fiori_elements', 'webapp', 'manifest.json')
        );
        expect(projectRoot).toEqual(expectedProjectRoot);
    });
});

describe('Test getAppRootFromManifestPath()', () => {
    test('Fiori elements app with standard webapp folder', async () => {
        const appRoot = join(testDataRoot, 'project', 'webapp-path', 'default-webapp-path');
        const manifestPath = join(appRoot, 'webapp');
        expect(await getAppRootFromWebappPath(manifestPath)).toBe(appRoot);
    });

    test('Freestyle app with custom webapp path.', async () => {
        const appRoot = join(testDataRoot, 'project', 'webapp-path', 'custom-webapp-path');
        const manifestPath = join(appRoot, 'src', 'webapp');
        expect(await getAppRootFromWebappPath(manifestPath)).toBe(appRoot);
    });
});
