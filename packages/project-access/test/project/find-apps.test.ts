import { basename, dirname, join } from 'path';
import type { WorkspaceFolder } from '../../src';
import { findAllApps, findCapProjects, findFioriArtifacts, findProjectRoot, getAppRootFromWebappPath } from '../../src';

/**
 * To get CAP project type we call cds --version using child_process.spawn() and cache global install path.
 * During pipeline test there is no local or global installation of @sap/cds, which is causing test delays
 * due to many spawn calls. Mock child_process to speed up test execution.
 */
jest.mock('child_process');

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
            'CAPJava_mix-fiori_elements_with_ui5tooling_and_localyaml',
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

    test('No package.json in silent mode should not throw', async () => {
        const path = await findProjectRoot(join('/'), true, true);
        expect(path).toStrictEqual('');
    });

    test('package.json exists, but sapux is missing in silent mode should not throw', async () => {
        const path = await findProjectRoot(__dirname, true, true);
        expect(path).toStrictEqual('');
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

describe('Test findFioriArtifacts()', () => {
    test('Find all artifacts', async () => {
        const result = await findFioriArtifacts({
            wsFolders: [join(testDataRoot, 'project/find-all-apps')],
            artifacts: ['adaptations', 'applications', 'extensions', 'libraries']
        });
        expect(result.applications?.length).toBeGreaterThan(0);
        expect(result.adaptations).toEqual([
            {
                appRoot: join(testDataRoot, 'project/find-all-apps/adaptations/valid-adaptation'),
                manifestAppdescrVariantPath: join(
                    testDataRoot,
                    'project/find-all-apps/adaptations/valid-adaptation/webapp/manifest.appdescr_variant'
                )
            }
        ]);
        expect(result.extensions).toEqual([
            {
                appRoot: join(testDataRoot, 'project/find-all-apps/extensions/valid-extension'),
                manifestPath: join(
                    testDataRoot,
                    'project/find-all-apps/extensions/valid-extension/webapp/manifest.json'
                ),
                manifest: {
                    'sap.app': {
                        'type': 'application'
                    }
                }
            }
        ]);
        expect(result.libraries).toEqual([
            {
                libraryPath: join(testDataRoot, 'project/find-all-apps/libraries/dot-library/src/com/sap/library'),
                projectRoot: join(testDataRoot, 'project/find-all-apps/libraries/dot-library')
            },
            {
                manifestPath: join(testDataRoot, 'project/find-all-apps/libraries/valid-library/src/manifest.json'),
                manifest: {
                    'sap.app': {
                        'type': 'library'
                    }
                },
                projectRoot: join(testDataRoot, 'project/find-all-apps/libraries/valid-library')
            }
        ]);
    });

    test('Find all libraries to check reading without cached manifest', async () => {
        const result = await findFioriArtifacts({
            wsFolders: [join(testDataRoot, 'project/find-all-apps/libraries')],
            artifacts: ['libraries']
        });
        expect(result.applications).toBeUndefined();
        expect(result.adaptations).toBeUndefined();
        expect(result.extensions).toBeUndefined();
        expect(result.libraries).toEqual([
            {
                libraryPath: join(testDataRoot, 'project/find-all-apps/libraries/dot-library/src/com/sap/library'),
                projectRoot: join(testDataRoot, 'project/find-all-apps/libraries/dot-library')
            },
            {
                manifestPath: join(testDataRoot, 'project/find-all-apps/libraries/valid-library/src/manifest.json'),
                manifest: {
                    'sap.app': {
                        'type': 'library'
                    }
                },
                projectRoot: join(testDataRoot, 'project/find-all-apps/libraries/valid-library')
            }
        ]);
    });

    test('Find all extensions without cached manifest', async () => {
        const result = await findFioriArtifacts({
            wsFolders: [join(testDataRoot, 'project/find-all-apps/extensions')],
            artifacts: ['extensions']
        });
        expect(result.applications).toBeUndefined();
        expect(result.adaptations).toBeUndefined();
        expect(result.libraries).toBeUndefined();
        expect(result.extensions).toEqual([
            {
                appRoot: join(testDataRoot, 'project/find-all-apps/extensions/valid-extension'),
                manifestPath: join(
                    testDataRoot,
                    'project/find-all-apps/extensions/valid-extension/webapp/manifest.json'
                ),
                manifest: {
                    'sap.app': {
                        'type': 'application'
                    }
                }
            }
        ]);
    });

    test('Find all extensions and libraries, libraries have no result', async () => {
        const result = await findFioriArtifacts({
            wsFolders: [join(testDataRoot, 'project/find-all-apps/extensions')],
            artifacts: ['libraries', 'extensions']
        });
        expect(result.applications).toBeUndefined();
        expect(result.adaptations).toBeUndefined();
        expect(result.libraries?.length).toBe(0);
        expect(result.extensions).toEqual([
            {
                appRoot: join(testDataRoot, 'project/find-all-apps/extensions/valid-extension'),
                manifestPath: join(
                    testDataRoot,
                    'project/find-all-apps/extensions/valid-extension/webapp/manifest.json'
                ),
                manifest: {
                    'sap.app': {
                        'type': 'application'
                    }
                }
            }
        ]);
    });
});

describe('Test findCapProjects()', () => {
    test('Find CAP projects', async () => {
        const capProjects = (
            await findCapProjects({
                wsFolders: [
                    join(__dirname, '../test-data/project/cap-root/'),
                    join(__dirname, '../test-data/project/find-all-apps/')
                ]
            })
        ).sort();
        const expectedProjects = [
            join(__dirname, '../test-data/project/cap-root/valid-cap-root'),
            join(__dirname, '../test-data/project/find-all-apps/CAP/CAPJava_fiori_elements'),
            join(__dirname, '../test-data/project/find-all-apps/CAP/CAPJava_freestyle'),
            join(__dirname, '../test-data/project/find-all-apps/CAP/CAPJava_mix'),
            join(__dirname, '../test-data/project/find-all-apps/CAP/CAPnode_mix'),
            join(__dirname, '../test-data/project/find-all-apps/CAP/CAPnode_freestyle'),
            join(__dirname, '../test-data/project/find-all-apps/CAP/CAPnode_fiori_elements')
        ].sort();
        expect(capProjects).toEqual(expectedProjects);
    });
});
