import { jest } from '@jest/globals';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Editor } from 'mem-fs-editor';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import fileSystem, { readFileSync } from 'node:fs';
import type { Logger } from '@sap-ux/logger/src/types';
import * as appModels from '../test-input/constants.js';
const __dirname = dirname(fileURLToPath(import.meta.url));

const readAppMock = jest.fn();
const realProjectAccess = await import('@sap-ux/project-access');
jest.unstable_mockModule('@sap-ux/project-access', () => ({
    ...realProjectAccess,
    createApplicationAccess: jest.fn().mockResolvedValue({
        getSpecification: jest.fn().mockResolvedValue({
            readApp: () => readAppMock()
        })
    })
}));

const existsSyncMock = jest.fn();
const actualFs = await import('node:fs');
jest.unstable_mockModule('node:fs', () => ({
    ...actualFs,
    existsSync: (...args: unknown[]) => existsSyncMock(...args)
}));

const hasVirtualOPA5Mock = jest.fn();
const addPathsToQUnitJsMock = jest.fn();
const actualOpaQUnitUtils = await import('../../src/utils/opaQUnitUtils.js');
jest.unstable_mockModule('../../src/utils/opaQUnitUtils.js', () => ({
    ...actualOpaQUnitUtils,
    hasVirtualOPA5: (...args: unknown[]) => hasVirtualOPA5Mock(...args),
    addPathsToQUnitJs: (...args: unknown[]) => addPathsToQUnitJsMock(...args)
}));

const { generateOPAFiles } = await import('../../src/fiori-elements-opa-writer.js');

describe('ui5-test-writer', () => {
    let fs: Editor | undefined;
    const debug = !!process.env['UX_DEBUG'];
    jest.setTimeout(600000);

    beforeAll(async () => {
        // Pass existsSync and addPathsToQUnitJs through to real implementations by default
        existsSyncMock.mockImplementation(actualFs.existsSync);

        const realOpaQUnitUtils = await import('../../src/utils/opaQUnitUtils.js');
        addPathsToQUnitJsMock.mockImplementation(realOpaQUnitUtils.addPathsToQUnitJs);
    });

    function prepareTestFiles(testConfigurationName: string): string {
        // Copy input templates into output directory
        const inputDir = join(__dirname, '../test-input', testConfigurationName);
        const outputDir = join(__dirname, '../test-output', testConfigurationName);
        fs = create(createStorage());
        if (fileSystem.existsSync(inputDir)) {
            fs.copy(inputDir, outputDir);
        }

        return outputDir;
    }

    afterEach(() => {
        return new Promise((resolve) => {
            // write out the files for debugging
            if (debug && fs) {
                fs.commit(resolve);
                fs = undefined;
            } else {
                fs = undefined;
                resolve(true);
            }
        });
    });

    describe('generateOPAFiles', () => {
        const metadata = readFileSync(join(__dirname, '../fixtures/metadata.xml')).toString();
        const metadataMissingSemanticFilter = readFileSync(
            join(__dirname, '../fixtures/metadata_filter_bar_semantic_key.xml')
        ).toString();
        const testApplications = [
            {
                description: 'Fullscreen LR-OP',
                dirPath: 'FullScreenLROP',
                scriptName: undefined
            },
            {
                description: 'FCL LR-OP',
                dirPath: 'FclLROP',
                scriptName: 'myOPATest'
            },
            {
                description: 'Fullscreen start on OP',
                dirPath: 'FullScreenOP',
                scriptName: undefined
            },
            {
                description: 'FCL start on OP',
                dirPath: 'FclOP',
                scriptName: undefined
            },
            {
                description: 'Fullscreen only OP without start page',
                dirPath: 'FullScreenOPNoStart',
                scriptName: undefined
            },
            {
                description: 'Fullscreen with 2 Sub-OP',
                dirPath: 'FullScreenSubOP',
                scriptName: undefined
            },
            {
                description: 'Fullscreen with custom FPM page',
                dirPath: 'CustomOP',
                scriptName: undefined
            },
            {
                description: 'Fullscreen With LR only',
                dirPath: 'FullScreenLR',
                scriptName: undefined
            },
            {
                description: 'Fullscreen LR-OP using "contextPath"',
                dirPath: 'FullScreenLROPContextPath',
                scriptName: undefined
            },
            {
                description: 'Fullscreen with 2 Sub-OP using "contextPath"',
                dirPath: 'FullScreenSubOPContextPath',
                scriptName: undefined
            },
            {
                description: 'LROP v4 app with annotations and metadata"',
                dirPath: 'LROPv4',
                scriptName: undefined
            },
            {
                description: 'LROP v4 app with annotations and metadata, missing SelectionFields annotation"',
                dirPath: 'LROPv4NoFilters',
                scriptName: undefined
            },
            {
                description: 'LROP v4 app with annotations and metadata, missing LineItem annotation"',
                dirPath: 'LROPv4NoColumns',
                scriptName: undefined
            },
            {
                description: 'LROP v4 app with annotations and metadata, package.json has no sapux: true"',
                dirPath: 'LROPv4IncorrectPackageJson',
                scriptName: undefined
            }
        ];

        it.each(testApplications)('$description', async (config) => {
            const projectDir = prepareTestFiles(config.dirPath);
            fs = await generateOPAFiles(projectDir, { scriptName: config.scriptName }, metadata, fs);
            expect(fs.dump(projectDir)).toMatchSnapshot();
        });

        it('No manifest', async () => {
            const projectDir = prepareTestFiles('Not_Here');
            let error: string | undefined;
            try {
                fs = await generateOPAFiles(projectDir, {}, metadata, fs);
            } catch (e) {
                error = (e as Error).message;
            }

            expect(error?.startsWith('Validation error: Cannot read the `manifest.json` file:')).toEqual(true);
        });

        it('Missing app ID', async () => {
            const projectDir = prepareTestFiles('MissingAppId');
            let error: string | undefined;
            try {
                fs = await generateOPAFiles(projectDir, {}, metadata, fs);
            } catch (e) {
                error = (e as Error).message;
            }

            expect(error).toEqual('Validation error: Cannot read `appID` in the `manifest.json` file.');
        });

        it('Providing an app ID', async () => {
            const projectDir = prepareTestFiles('MissingAppId');
            fs = await generateOPAFiles(projectDir, { appID: 'test.ui5-test-writer' }, metadata, fs);
            expect(fs.dump(projectDir)).toMatchSnapshot();
        });

        it('Freestyle app not supported', async () => {
            const projectDir = prepareTestFiles('FreeStyle');
            let error: string | undefined;
            try {
                fs = await generateOPAFiles(projectDir, {}, metadata, fs);
            } catch (e) {
                error = (e as Error).message;
            }

            expect(error).toEqual(
                'Validation error: Cannot determine the application type from the `manifest.json` file or it uses an unsupported type.'
            );
        });

        it('FE V2 not supported', async () => {
            const projectDir = prepareTestFiles('ODataV2');
            let error: string | undefined;
            try {
                fs = await generateOPAFiles(projectDir, {}, metadata, fs);
            } catch (e) {
                error = (e as Error).message;
            }

            expect(error).toEqual(
                'Validation error: Cannot determine the application type from the `manifest.json` file or it uses an unsupported type.'
            );
        });

        it('generates filter tests for Worklistv4 app', async () => {
            readAppMock.mockResolvedValueOnce(JSON.parse(appModels.V4_MODEL));
            const projectDir = prepareTestFiles('Worklistv4');
            fs = await generateOPAFiles(projectDir, {}, metadata, fs);

            expect(fs.dump(projectDir)).toMatchSnapshot();
            const firstJourneyContent =
                fs.dump()['test/test-output/Worklistv4/webapp/test/integration/FirstJourney.js'].contents;
            expect(firstJourneyContent).not.toContain('iCheckFilterField');
        });

        it('generates filter tests for LROPv4 app', async () => {
            readAppMock.mockResolvedValueOnce(JSON.parse(appModels.V4_MODEL));
            const projectDir = prepareTestFiles('LROPv4');
            fs = await generateOPAFiles(projectDir, {}, metadata, fs);

            expect(fs.dump(projectDir)).toMatchSnapshot();
            const firstJourneyContent =
                fs.dump()['test/test-output/LROPv4/webapp/test/integration/TravelListJourney.js'].contents;
            expect(firstJourneyContent).toContain('iCheckFilterField');
        });

        it('generates filter tests for LROPv4 app (missing semantic filter)', async () => {
            readAppMock.mockResolvedValueOnce(JSON.parse(appModels.V4_MODEL_FILTER_BAR_NO_TRAVEL_ID));
            const projectDir = prepareTestFiles('LROPv4');
            fs = await generateOPAFiles(projectDir, {}, metadataMissingSemanticFilter, fs);

            expect(fs.dump(projectDir)).toMatchSnapshot();
        });

        it('generates column tests for LROPv4 app', async () => {
            readAppMock.mockResolvedValueOnce(JSON.parse(appModels.V4_NO_FILTER_MODEL));
            const projectDir = prepareTestFiles('LROPv4');
            fs = await generateOPAFiles(projectDir, {}, metadata, fs);

            const firstJourneyContent =
                fs.dump()['test/test-output/LROPv4/webapp/test/integration/TravelListJourney.js'].contents;
            expect(firstJourneyContent).toContain('iCheckColumns');
        });

        it('skips testsuite and opaTests harness files when useVirtualPreviewEndpoints is enabled', async () => {
            readAppMock.mockResolvedValueOnce(JSON.parse(appModels.V4_MODEL));
            const projectDir = prepareTestFiles('LROPv4');
            fs = await generateOPAFiles(projectDir, { useVirtualPreviewEndpoints: true }, metadata, fs);

            const dumped = fs.dump(projectDir);
            const testFiles = Object.keys(dumped);
            expect(testFiles.some((f) => f.includes('testsuite.qunit'))).toBe(false);
            expect(testFiles.some((f) => f.includes('opaTests.qunit'))).toBe(false);
        });

        it('generates tests for LROPv4 app that has no filters in filter bar', async () => {
            readAppMock.mockResolvedValueOnce(JSON.parse(appModels.V4_NO_FILTER_MODEL));
            const projectDir = prepareTestFiles('LROPv4NoFilters');
            const mockLogger = {
                warn: jest.fn()
            };

            fs = await generateOPAFiles(projectDir, {}, metadata, fs, mockLogger as unknown as Logger);

            const firstJourneyContent =
                fs.dump()['test/test-output/LROPv4NoFilters/webapp/test/integration/TravelListJourney.js'].contents;
            expect(firstJourneyContent).not.toContain('iCheckFilterField');
            expect(firstJourneyContent).toContain('iCheckColumns');
            expect(mockLogger.warn).toHaveBeenCalledWith(
                expect.stringContaining(
                    'Unable to extract filter fields from project model using specification. No filter field tests will be generated.'
                )
            );
        });

        it('generates tests for LROPv4 app that has no columns in the table', async () => {
            readAppMock.mockResolvedValueOnce(JSON.parse(appModels.V4_MODEL));
            const projectDir = prepareTestFiles('LROPv4NoColumns');
            const mockLogger = {
                warn: jest.fn()
            };

            fs = await generateOPAFiles(projectDir, {}, metadata, fs, mockLogger as unknown as Logger);

            const firstJourneyContent =
                fs.dump()['test/test-output/LROPv4NoColumns/webapp/test/integration/TravelListJourney.js'].contents;
            expect(firstJourneyContent).toContain('iCheckFilterField');
            expect(firstJourneyContent).not.toContain('iCheckColumns');
            expect(mockLogger.warn).toHaveBeenCalledWith(
                expect.stringContaining(
                    'Unable to extract table columns from project model using specification. No table column tests will be generated.'
                )
            );
        });

        describe('standalone mode with virtual OPA5', () => {
            let realExistsSync: (path: string) => boolean;

            beforeAll(async () => {
                realExistsSync = actualFs.existsSync;
            });

            beforeEach(() => {
                hasVirtualOPA5Mock.mockResolvedValue(true);
            });

            afterEach(async () => {
                hasVirtualOPA5Mock.mockReset();
                // Restore pass-through so subsequent tests are unaffected
                existsSyncMock.mockImplementation(realExistsSync);
                const realOpaQUnitUtils = await import('../../src/utils/opaQUnitUtils.js');
                addPathsToQUnitJsMock.mockImplementation(realOpaQUnitUtils.addPathsToQUnitJs);
            });

            it('generates journey files but skips opaTests.qunit.js when OPA5 is configured in yaml and JourneyRunner exists', async () => {
                const projectDir = prepareTestFiles('LropVirtualTests');
                // Simulate JourneyRunner.js existing on disk; let other paths fall through to real fs
                existsSyncMock.mockImplementation((p: string) =>
                    typeof p === 'string' && p.includes('JourneyRunner.js') ? true : realExistsSync(p)
                );
                fs = await generateOPAFiles(projectDir, {}, metadata, fs, undefined, true);

                expect(fs.dump(projectDir)).toMatchSnapshot();
            });

            it('moves integration folder and skips common/page files when OPA5 is configured and no JourneyRunner', async () => {
                const projectDir = prepareTestFiles('LropVirtualTests');
                // Return false only for the test output JourneyRunner check (not template paths)
                existsSyncMock.mockImplementation((p) =>
                    p.includes('test-output') && p.includes('JourneyRunner.js') ? false : realExistsSync(p)
                );

                fs = await generateOPAFiles(projectDir, {}, metadata, fs, undefined, true);

                const dumped: Record<string, unknown> = fs.dump(projectDir);
                const paths = Object.keys(dumped);
                // Journey files should be written
                expect(paths.some((p) => p.includes('TravelListJourney.js'))).toBe(true);
                // opaTests.qunit.js and opaTests.qunit.html should NOT be written (virtual OPA5 skips them)
                expect(paths.every((p) => !p.includes('opaTests.qunit.js'))).toBe(true);
                expect(paths.every((p) => !p.includes('opaTests.qunit.html'))).toBe(true);
            });
        });

        describe('standalone mode without virtual OPA5', () => {
            let realExistsSync: (path: string) => boolean;

            beforeAll(() => {
                realExistsSync = actualFs.existsSync;
            });

            beforeEach(() => {
                hasVirtualOPA5Mock.mockResolvedValue(false);
            });

            afterEach(() => {
                hasVirtualOPA5Mock.mockReset();
                existsSyncMock.mockImplementation(realExistsSync);
                addPathsToQUnitJsMock.mockImplementation(actualOpaQUnitUtils.addPathsToQUnitJs);
            });

            it('moves integration folder and writes common/page/journey files when no JourneyRunner and OPA5 not virtual', async () => {
                const projectDir = prepareTestFiles('LropVirtualTests');
                // Return false only for the test output JourneyRunner check (not template paths)
                existsSyncMock.mockImplementation((p) =>
                    p.includes('test-output') && p.includes('JourneyRunner.js') ? false : realExistsSync(p)
                );

                fs = await generateOPAFiles(projectDir, {}, metadata, fs, undefined, true);

                const dumped: Record<string, unknown> = fs.dump(projectDir);
                const paths = Object.keys(dumped);
                // opaTests.qunit.js should be generated (no virtual OPA5)
                expect(paths.some((p) => p.includes('opaTests.qunit.js'))).toBe(true);
                // Journey files should be written
                expect(paths.some((p) => p.includes('TravelListJourney.js'))).toBe(true);
                // JourneyRunner.js should be written as part of common files
                expect(paths.some((p) => p.includes('JourneyRunner.js'))).toBe(true);
            });

            it('adds journey paths to opaTests.qunit.js when JourneyRunner exists and OPA5 not virtual', async () => {
                const projectDir = prepareTestFiles('LropVirtualTests');
                readAppMock.mockResolvedValueOnce(JSON.parse(appModels.V4_MODEL));
                // Return true only for the test output JourneyRunner check (not template paths)
                existsSyncMock.mockImplementation((p) =>
                    p.includes('test-output') && p.includes('JourneyRunner.js') ? true : realExistsSync(p)
                );
                addPathsToQUnitJsMock.mockImplementation(jest.fn());

                fs = await generateOPAFiles(projectDir, {}, metadata, fs, undefined, true);

                // addPathsToQUnitJs should have been called with journey module paths
                expect(addPathsToQUnitJsMock).toHaveBeenCalledWith(
                    expect.arrayContaining([expect.stringContaining('Journey')]),
                    expect.any(String),
                    expect.anything()
                );
            });

            it('adds int-test script and resolves htmlTarget from flpSandbox.html when no integration folder exists', async () => {
                // LropNoTests has no integration/ folder, no test script, and a flpSandbox.html
                const projectDir = prepareTestFiles('LropNoTests');
                existsSyncMock.mockImplementation((p) => {
                    // No JourneyRunner.js → goes into resolveStandaloneWriteContext
                    if (p.includes('test-output') && p.includes('JourneyRunner.js')) {
                        return false;
                    }
                    // No existing integration/ folder → falls into the else branch
                    if (p.includes('test-output') && p.endsWith('integration')) {
                        return false;
                    }
                    // flpSandbox.html exists in the project (only in mem-fs, not on real disk)
                    if (p.includes('test-output') && p.endsWith('flpSandbox.html')) {
                        return true;
                    }
                    return realExistsSync(p);
                });

                fs = await generateOPAFiles(projectDir, {}, metadata, fs, undefined, true);

                const dumped = fs.dump(projectDir);

                // int-test script should have been added to package.json
                const packageJsonPath = Object.keys(dumped).find((p) => p.endsWith('package.json'));
                expect(packageJsonPath).toBeDefined();
                const packageJson = JSON.parse(dumped[packageJsonPath!].contents as string);
                expect(packageJson.scripts['int-test']).toContain('opaTests.qunit.html');

                // htmlTarget resolved from flpSandbox.html should appear in JourneyRunner.js launchUrl
                const journeyRunnerPath = Object.keys(dumped).find((p) => p.includes('JourneyRunner.js'));
                expect(journeyRunnerPath).toBeDefined();
                expect(dumped[journeyRunnerPath!].contents).toContain('C_Arbankstatement-display');
            });

            it('moves existing integration folder to integration_old when no JourneyRunner exists', async () => {
                // LropVirtualTests has an integration/ folder on disk
                const projectDir = prepareTestFiles('LropVirtualTests');
                const moveSpy = jest.spyOn(fs!, 'move');
                existsSyncMock.mockImplementation((p) => {
                    if (p.includes('test-output') && p.includes('JourneyRunner.js')) {
                        return false;
                    }
                    // Simulate existing integration/ folder in the output dir
                    if (p.includes('test-output') && p.endsWith('integration')) {
                        return true;
                    }
                    return realExistsSync(p);
                });

                fs = await generateOPAFiles(projectDir, {}, metadata, fs, undefined, true);

                expect(moveSpy).toHaveBeenCalledWith(
                    expect.stringContaining(join('integration', '**')),
                    expect.stringContaining('integration_old')
                );
                moveSpy.mockRestore();
            });

            it('writes missing page objects and calls addPagesToJourneyRunner when JourneyRunner exists but pages are absent', async () => {
                // LropVirtualTests has JourneyRunner.js — simulate page files not yet existing in mem-fs
                const projectDir = prepareTestFiles('LropVirtualTests');
                readAppMock.mockResolvedValueOnce(JSON.parse(appModels.V4_MODEL));
                existsSyncMock.mockImplementation((p) =>
                    p.includes('test-output') && p.includes('JourneyRunner.js') ? true : realExistsSync(p)
                );

                // Make editor.exists return false for page files so ensurePageExists writes them
                const origExists = fs!.exists.bind(fs!);
                const existsSpy = jest.spyOn(fs!, 'exists').mockImplementation((p) => {
                    if (
                        typeof p === 'string' &&
                        p.includes('test-output') &&
                        p.includes('pages') &&
                        p.endsWith('.js')
                    ) {
                        return false;
                    }
                    return origExists(p);
                });

                addPathsToQUnitJsMock.mockImplementation(jest.fn());
                fs = await generateOPAFiles(projectDir, {}, metadata, fs, undefined, true);

                const dumped = fs.dump(projectDir);
                // Page object files should have been written by ensurePageExists
                expect(Object.keys(dumped).some((p) => p.includes('pages') && p.includes('TravelList.js'))).toBe(true);
                // addPathsToQUnitJs should have been called (hasJourneyRunner path)
                expect(addPathsToQUnitJsMock).toHaveBeenCalled();

                existsSpy.mockRestore();
            });

            it('skips adding int-test script when it already exists in package.json', async () => {
                // LropNoTests has no integration/ folder; pre-populate int-test so the
                // addition is skipped, covering the hasTestScript = true branch
                const projectDir = prepareTestFiles('LropNoTests');
                existsSyncMock.mockImplementation((p) => {
                    if (p.includes('test-output') && p.includes('JourneyRunner.js')) {
                        return false;
                    }
                    if (p.includes('test-output') && p.endsWith('integration')) {
                        return false;
                    }
                    if (p.includes('test-output') && p.endsWith('flpSandbox.html')) {
                        return false;
                    }
                    return realExistsSync(p);
                });

                // Pre-inject int-test so checkScriptInPackageJson returns true and skips re-adding it
                const pkgPath = join(projectDir, 'package.json');
                const pkg = JSON.parse(fs!.read(pkgPath));
                const existingScript = 'fiori run --existing';
                pkg.scripts['int-test'] = existingScript;
                fs!.write(pkgPath, JSON.stringify(pkg));

                fs = await generateOPAFiles(projectDir, {}, metadata, fs, undefined, true);

                const dumped = fs.dump(projectDir);
                // int-test script should remain unchanged (not overwritten)
                const packageJsonPath = Object.keys(dumped).find((p) => p.endsWith('package.json'));
                expect(packageJsonPath).toBeDefined();
                const packageJson = JSON.parse(dumped[packageJsonPath!].contents as string);
                expect(packageJson.scripts['int-test']).toBe(existingScript);
                // Generation still completes
                expect(Object.keys(dumped).some((p) => p.includes('FirstJourney.js'))).toBe(true);
            });
        });

        describe('standalone mode TypeScript auto-detection', () => {
            let realExistsSync: (path: string) => boolean;

            beforeAll(() => {
                realExistsSync = jest.requireActual<{ existsSync: (path: string) => boolean }>('node:fs').existsSync;
            });

            beforeEach(() => {
                hasVirtualOPA5Mock.mockResolvedValue(false);
            });

            afterEach(() => {
                hasVirtualOPA5Mock.mockReset();
                existsSyncMock.mockImplementation(realExistsSync);
            });

            it('auto-detects TypeScript when tsconfig.json exists and options.enableTypeScript is undefined', async () => {
                const projectDir = prepareTestFiles('LropVirtualTests');
                // Pretend the project has a tsconfig.json (TS app), no JourneyRunner.ts on disk,
                // but the existing integration folder is present (so it gets moved to integration_old).
                existsSyncMock.mockImplementation((p: string) => {
                    if (typeof p !== 'string' || !p.includes('test-output')) {
                        return realExistsSync(p);
                    }
                    if (p.endsWith('tsconfig.json')) {
                        return true;
                    }
                    if (p.includes('JourneyRunner')) {
                        return false;
                    }
                    if (p.endsWith('integration')) {
                        return true;
                    }
                    return realExistsSync(p);
                });

                fs = await generateOPAFiles(projectDir, {}, metadata, fs, undefined, true);

                const dumped = fs.dump(projectDir);
                const paths = Object.keys(dumped);
                // Active (non-deleted) entries only
                const isActive = (p: string): boolean => (dumped[p] as { state?: string }).state !== 'deleted';

                // TS files generated under integration/ (not integration_old/)
                expect(paths.some((p) => p.includes('integration/pages/JourneyRunner.ts') && isActive(p))).toBe(true);
                expect(paths.some((p) => p.includes('integration/types/OpaJourneyTypes.d.ts') && isActive(p))).toBe(
                    true
                );
                // The existing JS journey runner is moved to integration_old/ (no active JS runner under integration/)
                const activeJourneyRunnerJs = paths.find(
                    (p) =>
                        p.includes('integration/pages/JourneyRunner.js') &&
                        !p.includes('integration_old') &&
                        isActive(p)
                );
                expect(activeJourneyRunnerJs).toBeUndefined();
            });

            it('keeps JavaScript when tsconfig.json is absent', async () => {
                const projectDir = prepareTestFiles('LropVirtualTests');
                existsSyncMock.mockImplementation((p: string) => {
                    if (typeof p !== 'string' || !p.includes('test-output')) {
                        return realExistsSync(p);
                    }
                    if (p.endsWith('tsconfig.json')) {
                        return false;
                    }
                    if (p.includes('JourneyRunner')) {
                        return false;
                    }
                    if (p.endsWith('integration')) {
                        return true;
                    }
                    return realExistsSync(p);
                });

                fs = await generateOPAFiles(projectDir, {}, metadata, fs, undefined, true);

                const dumped = fs.dump(projectDir);
                const paths = Object.keys(dumped);
                const isActive = (p: string): boolean => (dumped[p] as { state?: string }).state !== 'deleted';

                expect(
                    paths.some(
                        (p) =>
                            p.includes('integration/pages/JourneyRunner.js') &&
                            !p.includes('integration_old') &&
                            isActive(p)
                    )
                ).toBe(true);
                expect(paths.some((p) => p.includes('integration/pages/JourneyRunner.ts') && isActive(p))).toBe(false);
                expect(paths.some((p) => p.includes('integration/types/OpaJourneyTypes.d.ts') && isActive(p))).toBe(
                    false
                );
            });

            it('respects explicit options.enableTypeScript=false even when tsconfig.json exists', async () => {
                const projectDir = prepareTestFiles('LropVirtualTests');
                existsSyncMock.mockImplementation((p: string) => {
                    if (typeof p !== 'string' || !p.includes('test-output')) {
                        return realExistsSync(p);
                    }
                    if (p.endsWith('tsconfig.json')) {
                        return true;
                    }
                    if (p.includes('JourneyRunner')) {
                        return false;
                    }
                    if (p.endsWith('integration')) {
                        return true;
                    }
                    return realExistsSync(p);
                });

                fs = await generateOPAFiles(projectDir, { enableTypeScript: false }, metadata, fs, undefined, true);

                const dumped = fs.dump(projectDir);
                const paths = Object.keys(dumped);
                const isActive = (p: string): boolean => (dumped[p] as { state?: string }).state !== 'deleted';

                expect(
                    paths.some(
                        (p) =>
                            p.includes('integration/pages/JourneyRunner.js') &&
                            !p.includes('integration_old') &&
                            isActive(p)
                    )
                ).toBe(true);
                expect(paths.some((p) => p.includes('integration/pages/JourneyRunner.ts') && isActive(p))).toBe(false);
            });

            it('detects existing JourneyRunner.ts in TS mode (extension-aware hasJourneyRunner)', async () => {
                // Verify the standalone path detects an existing TS JourneyRunner and avoids
                // the relocate-to-integration_old branch when only the .ts variant is present.
                const projectDir = prepareTestFiles('LropVirtualTests');
                existsSyncMock.mockImplementation((p: string) => {
                    if (typeof p !== 'string' || !p.includes('test-output')) {
                        return realExistsSync(p);
                    }
                    if (p.endsWith('tsconfig.json')) {
                        return true;
                    }
                    if (p.endsWith('JourneyRunner.ts')) {
                        return true;
                    }
                    if (p.endsWith('JourneyRunner.js')) {
                        return false;
                    }
                    return realExistsSync(p);
                });

                fs = await generateOPAFiles(projectDir, {}, metadata, fs, undefined, true);

                const dumped = fs.dump(projectDir);
                const paths = Object.keys(dumped);
                const isActive = (p: string): boolean => (dumped[p] as { state?: string }).state !== 'deleted';

                // No relocation happened — the existing integration/ folder is NOT moved to integration_old/
                expect(paths.some((p) => p.includes('integration_old') && isActive(p))).toBe(false);
            });
        });

        it('generates tests for v4 application with sub object page', async () => {
            readAppMock.mockResolvedValueOnce(JSON.parse(appModels.V4_WITH_SUB_OBJECT_PAGE));
            const projectDir = prepareTestFiles('LROPv4');
            const subOPMetadata =
                fs?.read(join(__dirname, '../test-input/LROPv4/webapp/localService/mainService/metadata.xml')) ?? '';
            fs = await generateOPAFiles(projectDir, {}, subOPMetadata, fs);

            const bookingObjPageJourneyContent =
                fs.dump()['test/test-output/LROPv4/webapp/test/integration/BookingObjectPageJourney.js'].contents;
            expect(bookingObjPageJourneyContent).toContain('iCheckHeaderFacet({ facetId: "DataPoint::FlightDate" }');
            expect(bookingObjPageJourneyContent).toContain('iCheckHeaderFacet({ facetId: "DataPoint::BookingDate" }');
            expect(bookingObjPageJourneyContent).toContain('iCheckHeaderFacet({ facetId: "FieldGroup::Names" }');
            expect(bookingObjPageJourneyContent).toContain('iCheckFieldInFieldGroup');
            expect(bookingObjPageJourneyContent).toContain('fieldGroup: "FieldGroup::Names"');
            expect(bookingObjPageJourneyContent).toContain('field: "AirlineName"');
            expect(bookingObjPageJourneyContent).toContain('field: "CustomerName"');
            expect(bookingObjPageJourneyContent).toContain('field: "carrier"');
            expect(bookingObjPageJourneyContent).toContain('targetAnnotation: "Contact"');
            expect(bookingObjPageJourneyContent).toContain('iCheckMicroChart("Supplement Price")');
            expect(bookingObjPageJourneyContent).toContain('onHeader().iCheckAction("Activate", { enabled: false })');
            expect(bookingObjPageJourneyContent).toContain('iCheckNumberOfSections(3)');
            expect(bookingObjPageJourneyContent).toContain('iPressSectionIconTabFilterButton("BookingDetails")');
            expect(bookingObjPageJourneyContent).toContain('iCheckSection({ section: "BookingDetails" })');
            expect(bookingObjPageJourneyContent).toContain('iCheckSubSection({ section: "BookingData" })');
            expect(bookingObjPageJourneyContent).toContain('iCheckSubSection({ section: "AdministrativeData" })');
            expect(bookingObjPageJourneyContent).toContain('iPressSectionIconTabFilterButton("FlightData")');
            expect(bookingObjPageJourneyContent).toContain('iCheckSection({ section: "FlightData" })');
            expect(bookingObjPageJourneyContent).toContain(
                '.iCheckAction("Deduct Discount" /* , { enabled: true } */)'
            );
            expect(bookingObjPageJourneyContent).toContain('iPressSectionIconTabFilterButton("PriceData")');
            expect(bookingObjPageJourneyContent).toContain('iCheckSection({ section: "PriceData" })');
            expect(bookingObjPageJourneyContent).toContain(
                'onTable({ property: "_BookSupplement" }).iCheckAction("Create Template", { enabled: true })'
            );
            expect(bookingObjPageJourneyContent).toContain(
                'onForm({ section: "BookingData" }).iCheckField({ property: "BookingId" })'
            );
            expect(bookingObjPageJourneyContent).toContain(
                'onForm({ section: "BookingData" }).iCheckField({ property: "FlightDate" })'
            );
            expect(bookingObjPageJourneyContent).toContain('onTable({ property: "_Supplements" }).iCheckColumns(');
            expect(bookingObjPageJourneyContent).toContain('"ConnectionId":{"header":"Connection"}');
            expect(bookingObjPageJourneyContent).toContain('"AirportCode":{"header":"Airport"}');
        });
    });

    describe('generateOPAFiles TypeScript', () => {
        const metadata = fs?.read(join(__dirname, '../test-input/metadata.xml')) ?? '';
        const metadataMissingSemanticFilter = readFileSync(
            join(__dirname, '../fixtures/metadata_filter_bar_semantic_key.xml')
        ).toString();

        const testApplications = [
            {
                description: 'Fullscreen LR-OP TypeScript',
                dirPath: 'FullScreenLROP',
                scriptName: undefined
            },
            {
                description: 'FCL LR-OP TypeScript',
                dirPath: 'FclLROP',
                scriptName: 'myOPATest'
            },
            {
                description: 'Fullscreen LR-OP using "contextPath" TypeScript',
                dirPath: 'FullScreenLROPContextPath',
                scriptName: undefined
            },
            {
                description: 'Fullscreen with 2 Sub-OP TypeScript',
                dirPath: 'FullScreenSubOP',
                scriptName: undefined
            },
            {
                description: 'Fullscreen With LR only TypeScript',
                dirPath: 'FullScreenLR',
                scriptName: undefined
            }
        ];

        it.each(testApplications)('$description', async (config) => {
            const projectDir = prepareTestFiles(config.dirPath);
            fs = await generateOPAFiles(
                projectDir,
                { scriptName: config.scriptName, enableTypeScript: true },
                metadata,
                fs
            );
            expect(fs.dump(projectDir)).toMatchSnapshot();
        });

        it('generates .ts file extensions for all journey and page files', async () => {
            const projectDir = prepareTestFiles('FullScreenLROP');
            fs = await generateOPAFiles(projectDir, { enableTypeScript: true }, metadata, fs);

            const paths = Object.keys(fs.dump(projectDir));
            const integrationFiles = paths.filter(
                (p) => p.includes('integration/') && !p.includes('opaTests.qunit') && !p.includes('OpaJourneyTypes')
            );

            for (const file of integrationFiles) {
                expect(file).toMatch(/\.ts$/);
            }
            expect(paths.some((p) => p.endsWith('.js') && p.includes('integration/pages/'))).toBe(false);
        });

        it('generates OpaJourneyTypes.d.ts with correct page entries', async () => {
            const projectDir = prepareTestFiles('FullScreenLROP');
            fs = await generateOPAFiles(projectDir, { enableTypeScript: true }, metadata, fs);

            const dumped = fs.dump(projectDir);
            const typesPath = Object.keys(dumped).find((p) => p.includes('OpaJourneyTypes.d.ts'));
            expect(typesPath).toBeDefined();

            const typesContent = dumped[typesPath!].contents as string;
            expect(typesContent).toContain('export type Given');
            expect(typesContent).toContain('export type When');
            expect(typesContent).toContain('export type Then');
            expect(typesContent).toContain(
                'onTheEmployeesList: Opa5 & ListReportActions & TemplatePageActions & typeof EmployeesListCustomActions'
            );
            expect(typesContent).toContain(
                'onTheEmployeesObjectPage: Opa5 & ObjectPageActions & TemplatePageActions & typeof EmployeesObjectPageCustomActions'
            );
            expect(typesContent).toContain(
                'onTheEmployeesObjectPage: Opa5 & ObjectPageAssertions & TemplatePageAssertions & typeof EmployeesObjectPageCustomAssertions'
            );
            expect(typesContent).toContain('onTheShell: Shell');
            expect(typesContent).toContain('import type Opa5 from "sap/ui/test/Opa5"');
            expect(typesContent).toContain('import type { actions as ListReportActions');
            expect(typesContent).toContain('import type { actions as ObjectPageActions');
            expect(typesContent).toContain(
                'import type { actions as EmployeesObjectPageCustomActions, assertions as EmployeesObjectPageCustomAssertions }'
            );
        });

        it('generates ES module imports in journey files', async () => {
            const projectDir = prepareTestFiles('FullScreenLROP');
            fs = await generateOPAFiles(projectDir, { enableTypeScript: true }, metadata, fs);

            const dumped = fs.dump(projectDir);
            const firstJourneyPath = Object.keys(dumped).find((p) => p.includes('FirstJourney.ts'));
            expect(firstJourneyPath).toBeDefined();

            const content = dumped[firstJourneyPath!].contents as string;
            expect(content).toContain('import opaTest from "sap/ui/test/opaQunit"');
            expect(content).toContain('import type { Given, When, Then }');
            expect(content).toContain('import runner from "./pages/JourneyRunner"');
            // Start application uses Given + Then (When unused, prefixed with _ per project lint convention)
            expect(content).toContain('function (Given: Given, _When: When, Then: Then)');
            expect(content).not.toContain('sap.ui.define');
            expect(content).not.toContain("'use strict'");
        });

        it('generates ES module page objects as classes wrapping named action/assertion exports', async () => {
            const projectDir = prepareTestFiles('FullScreenLROP');
            fs = await generateOPAFiles(projectDir, { enableTypeScript: true }, metadata, fs);

            const dumped = fs.dump(projectDir);
            const lrPagePath = Object.keys(dumped).find((p) => p.includes('pages/EmployeesList.ts'));
            expect(lrPagePath).toBeDefined();

            const lrContent = dumped[lrPagePath!].contents as string;
            // Page files own the custom actions/assertions and the wrapper class —
            // framework page-construction lives in JourneyRunner.ts.
            expect(lrContent).toContain('export const actions');
            expect(lrContent).toContain('export const assertions');
            expect(lrContent).toContain('export default class ListReport');
            expect(lrContent).toContain('actions = actions;');
            expect(lrContent).toContain('assertions = assertions;');
            expect(lrContent).not.toContain('sap/fe/test/ListReport');
            expect(lrContent).not.toContain('sap.ui.define');

            const opPagePath = Object.keys(dumped).find((p) => p.includes('pages/EmployeesObjectPage.ts'));
            expect(opPagePath).toBeDefined();

            const opContent = dumped[opPagePath!].contents as string;
            expect(opContent).toContain('import type Opa5 from "sap/ui/test/Opa5"');
            expect(opContent).toContain('import Press from "sap/ui/test/actions/Press"');
            expect(opContent).toContain('export const actions');
            expect(opContent).toContain('export const assertions');
            expect(opContent).toContain('export default class ObjectPage');
            expect(opContent).toContain('iPressSectionIconTabFilterButton');
            expect(opContent).toContain('this: Opa5');
            expect(opContent).not.toContain('sap/fe/test/ObjectPage');
        });

        it('generates JourneyRunner.ts that constructs framework page instances with custom classes', async () => {
            const projectDir = prepareTestFiles('FullScreenLROP');
            fs = await generateOPAFiles(projectDir, { enableTypeScript: true }, metadata, fs);

            const dumped = fs.dump(projectDir);
            const runnerPath = Object.keys(dumped).find((p) => p.includes('JourneyRunner.ts'));
            expect(runnerPath).toBeDefined();

            const content = dumped[runnerPath!].contents as string;
            // Framework imports
            expect(content).toContain('import JourneyRunner from "sap/fe/test/JourneyRunner"');
            expect(content).toContain('import ListReport from "sap/fe/test/ListReport"');
            expect(content).toContain('import ObjectPage from "sap/fe/test/ObjectPage"');
            // Custom-class imports (renamed with `Custom` prefix to avoid shadowing the framework class)
            expect(content).toContain('import CustomEmployeesList from "./EmployeesList"');
            expect(content).toContain('import CustomEmployeesObjectPage from "./EmployeesObjectPage"');
            // Each page is constructed inline with the framework class + custom class
            expect(content).toContain('onTheEmployeesList: new ListReport(');
            expect(content).toContain('onTheEmployeesObjectPage: new ObjectPage(');
            expect(content).toContain('CustomEmployeesList');
            expect(content).toContain('CustomEmployeesObjectPage');
            expect(content).toContain('export default runner');
            expect(content).not.toContain('sap.ui.define');
        });

        it('keeps opaTests.qunit files as JS even when TypeScript is enabled', async () => {
            const projectDir = prepareTestFiles('FullScreenLROP');
            fs = await generateOPAFiles(projectDir, { enableTypeScript: true }, metadata, fs);

            const dumped = fs.dump(projectDir);
            const paths = Object.keys(dumped);
            expect(paths.some((p) => p.includes('opaTests.qunit.js'))).toBe(true);
            expect(paths.some((p) => p.includes('opaTests.qunit.html'))).toBe(true);
            expect(paths.some((p) => p.includes('opaTests.qunit.ts'))).toBe(false);
        });

        it('uses contextPath in JourneyRunner page-construction when app uses contextPath', async () => {
            const projectDir = prepareTestFiles('FullScreenLROPContextPath');
            fs = await generateOPAFiles(projectDir, { enableTypeScript: true }, metadata, fs);

            const dumped = fs.dump(projectDir);
            const runnerPath = Object.keys(dumped).find((p) => p.includes('pages/JourneyRunner.ts'));
            expect(runnerPath).toBeDefined();

            const content = dumped[runnerPath!].contents as string;
            // The page-definition object passed to `new ListReport(...)` includes contextPath set
            // and entitySet empty (heimwege pattern: both fields always present, framework picks one).
            expect(content).toContain('contextPath: "/');
            expect(content).toContain('entitySet: ""');
        });

        it('generates TypeScript filter tests for LROPv4 app', async () => {
            readAppMock.mockResolvedValueOnce(JSON.parse(appModels.V4_MODEL));
            const projectDir = prepareTestFiles('LROPv4');
            fs = await generateOPAFiles(projectDir, { enableTypeScript: true }, metadata, fs);

            const dumped = fs.dump(projectDir);
            const lrJourneyPath = Object.keys(dumped).find((p) => p.includes('TravelListJourney.ts'));
            expect(lrJourneyPath).toBeDefined();
            const lrContent = dumped[lrJourneyPath!].contents as string;

            // TS-shape filter assertions (object form, not plain string)
            expect(lrContent).toContain('iCheckFilterField({ property: "TravelID" })');
            expect(lrContent).toContain('iCheckFilterField({ property: "AgencyID" })');
            expect(lrContent).toContain('iCheckFilterField({ property: "Kunden ID" })');

            // TS adaptation: onTable("") instead of onTable()
            expect(lrContent).toContain('onTable("")');
            expect(lrContent).not.toContain('onTable()');

            // The TS journey is typed, no AMD wrapper. Start application uses Given + Then (When prefixed with _ as unused).
            expect(lrContent).toContain('function (Given: Given, _When: When, Then: Then)');
            expect(lrContent).not.toContain('sap.ui.define');

            // Sanity: FirstJourney has no filter assertions (matches JS Worklistv4 test)
            const firstJourneyPath = Object.keys(dumped).find((p) => p.includes('FirstJourney.ts'));
            expect(firstJourneyPath).toBeDefined();
            const firstContent = dumped[firstJourneyPath!].contents as string;
            expect(firstContent).not.toContain('iCheckFilterField');
        });

        it('generates TypeScript filter tests for LROPv4 app (missing semantic filter)', async () => {
            readAppMock.mockResolvedValueOnce(JSON.parse(appModels.V4_MODEL_FILTER_BAR_NO_TRAVEL_ID));
            const projectDir = prepareTestFiles('LROPv4');
            fs = await generateOPAFiles(projectDir, { enableTypeScript: true }, metadataMissingSemanticFilter, fs);

            const dumped = fs.dump(projectDir);
            const lrJourneyPath = Object.keys(dumped).find((p) => p.includes('TravelListJourney.ts'));
            expect(lrJourneyPath).toBeDefined();
            const content = dumped[lrJourneyPath!].contents as string;

            // The semantic-key adaptation block is emitted with TS-shape calls
            expect(content).toContain('Add semantic key properties to filter bar');
            expect(content).toContain('iOpenFilterAdaptation()');
            expect(content).toContain('iAddAdaptationFilterField("TravelID")');
            expect(content).toContain('iConfirmFilterAdaptation()');
            expect(content).toContain('iCheckFilterField({ property: "TravelID" })');
            // Commented-out global search example uses the typed function signature
            expect(content).toContain('function (Given: Given, When: When, Then: Then)');
        });

        it('generates TypeScript column tests for LROPv4 app', async () => {
            readAppMock.mockResolvedValueOnce(JSON.parse(appModels.V4_NO_FILTER_MODEL));
            const projectDir = prepareTestFiles('LROPv4');
            fs = await generateOPAFiles(projectDir, { enableTypeScript: true }, metadata, fs);

            const dumped = fs.dump(projectDir);
            const lrJourneyPath = Object.keys(dumped).find((p) => p.includes('TravelListJourney.ts'));
            expect(lrJourneyPath).toBeDefined();
            const content = dumped[lrJourneyPath!].contents as string;

            expect(content).toContain('iCheckColumns');
            // TS adaptation: onTable("") on the column-check call
            expect(content).toMatch(/onTable\(""\)\.iCheckColumns/);
        });

        it('generates TypeScript tests for LROPv4 app that has no filters in filter bar', async () => {
            readAppMock.mockResolvedValueOnce(JSON.parse(appModels.V4_NO_FILTER_MODEL));
            const projectDir = prepareTestFiles('LROPv4NoFilters');
            const mockLogger = {
                warn: jest.fn()
            };

            fs = await generateOPAFiles(
                projectDir,
                { enableTypeScript: true },
                metadata,
                fs,
                mockLogger as unknown as Logger
            );

            const dumped = fs.dump(projectDir);
            const lrJourneyPath = Object.keys(dumped).find((p) => p.includes('TravelListJourney.ts'));
            expect(lrJourneyPath).toBeDefined();
            const content = dumped[lrJourneyPath!].contents as string;

            expect(content).not.toContain('iCheckFilterField');
            expect(content).toContain('iCheckColumns');
            expect(mockLogger.warn).toHaveBeenCalledWith(
                expect.stringContaining(
                    'Unable to extract filter fields from project model using specification. No filter field tests will be generated.'
                )
            );
        });

        it('generates TypeScript tests for LROPv4 app that has no columns in the table', async () => {
            readAppMock.mockResolvedValueOnce(JSON.parse(appModels.V4_MODEL));
            const projectDir = prepareTestFiles('LROPv4NoColumns');
            const mockLogger = {
                warn: jest.fn()
            };

            fs = await generateOPAFiles(
                projectDir,
                { enableTypeScript: true },
                metadata,
                fs,
                mockLogger as unknown as Logger
            );

            const dumped = fs.dump(projectDir);
            const lrJourneyPath = Object.keys(dumped).find((p) => p.includes('TravelListJourney.ts'));
            expect(lrJourneyPath).toBeDefined();
            const content = dumped[lrJourneyPath!].contents as string;

            expect(content).toContain('iCheckFilterField');
            expect(content).not.toContain('iCheckColumns');
            expect(mockLogger.warn).toHaveBeenCalledWith(
                expect.stringContaining(
                    'Unable to extract table columns from project model using specification. No table column tests will be generated.'
                )
            );
        });

        it('generates TypeScript tests for v4 application with sub object page', async () => {
            readAppMock.mockResolvedValueOnce(JSON.parse(appModels.V4_WITH_SUB_OBJECT_PAGE));
            const projectDir = prepareTestFiles('LROPv4');
            const subOPMetadata =
                fs?.read(join(__dirname, '../test-input/LROPv4/webapp/localService/mainService/metadata.xml')) ?? '';
            fs = await generateOPAFiles(projectDir, { enableTypeScript: true }, subOPMetadata, fs);

            const dumped = fs.dump(projectDir);
            const opJourneyPath = Object.keys(dumped).find((p) => p.includes('BookingObjectPageJourney.ts'));
            expect(opJourneyPath).toBeDefined();
            const content = dumped[opJourneyPath!].contents as string;

            // ─── Type-only imports for the @sapui5/types casts ───
            expect(content).toContain('import type { Given, When, Then }');
            expect(content).toContain('import type { FieldIdentifier } from "sap/fe/test/api/BaseAPI"');
            expect(content).toContain('import type { FormIdentifier } from "sap/fe/test/api/FormAPI"');

            // ─── Header facets (same shape as JS) ───
            expect(content).toContain('iCheckHeaderFacet({ facetId: "DataPoint::FlightDate" }');
            expect(content).toContain('iCheckHeaderFacet({ facetId: "DataPoint::BookingDate" }');
            expect(content).toContain('iCheckHeaderFacet({ facetId: "FieldGroup::Names" }');

            // ─── iCheckFieldInFieldGroup with FieldIdentifier cast (TS adaptation) ───
            expect(content).toContain('iCheckFieldInFieldGroup');
            expect(content).toContain('fieldGroup: "FieldGroup::Names"');
            expect(content).toContain('field: "AirlineName"');
            expect(content).toContain('field: "CustomerName"');
            expect(content).toContain('field: "carrier"');
            expect(content).toContain('targetAnnotation: "Contact"');
            expect(content).toContain('} as unknown as FieldIdentifier);');

            // ─── iCheckMicroChart with empty 2nd arg (TS adaptation) ───
            expect(content).toContain('iCheckMicroChart("Supplement Price", "")');

            // ─── Header actions (from PR #4632) ───
            expect(content).toContain('onHeader().iCheckAction("Activate", { enabled: false })');

            // ─── Section navigation ───
            expect(content).toContain('iCheckNumberOfSections(3)');
            expect(content).toContain('iPressSectionIconTabFilterButton("BookingDetails")');
            expect(content).toContain('iCheckSection({ section: "BookingDetails" }, {})');
            expect(content).toContain('iCheckSubSection({ section: "BookingData" })');
            expect(content).toContain('iCheckSubSection({ section: "AdministrativeData" })');
            expect(content).toContain('iPressSectionIconTabFilterButton("FlightData")');
            expect(content).toContain('iCheckSection({ section: "FlightData" }, {})');
            expect(content).toContain('iPressSectionIconTabFilterButton("PriceData")');
            expect(content).toContain('iCheckSection({ section: "PriceData" }, {})');

            // ─── Section actions (table action with dynamic enabled) ───
            expect(content).toContain('.iCheckAction("Deduct Discount" /* , { enabled: true } */)');
            expect(content).toContain(
                'onTable({ property: "_BookSupplement" }).iCheckAction("Create Template", { enabled: true })'
            );

            // ─── onForm with FormIdentifier cast (TS adaptation) ───
            expect(content).toContain(
                'onForm({ section: "BookingData" } as unknown as FormIdentifier).iCheckField({ property: "BookingId" })'
            );
            expect(content).toContain(
                'onForm({ section: "BookingData" } as unknown as FormIdentifier).iCheckField({ property: "FlightDate" })'
            );

            // ─── Sub-section table columns ───
            expect(content).toContain('onTable({ property: "_Supplements" }).iCheckColumns(');
            expect(content).toContain('"ConnectionId":{"header":"Connection"}');
            expect(content).toContain('"AirportCode":{"header":"Airport"}');

            // ─── No JS leakage ───
            expect(content).not.toContain('sap.ui.define');
            expect(content).not.toContain("'use strict'");
        });

        it('does not modify tsconfig.json', async () => {
            const projectDir = prepareTestFiles('FullScreenLROP');
            const tsconfigPath = join(projectDir, 'tsconfig.json');
            const tsconfigBefore = fs?.exists(tsconfigPath) ? fs?.read(tsconfigPath) : undefined;

            fs = await generateOPAFiles(projectDir, { enableTypeScript: true }, metadata, fs);

            const tsconfigAfter = fs.exists(tsconfigPath) ? fs.read(tsconfigPath) : undefined;
            expect(tsconfigAfter).toEqual(tsconfigBefore);
        });
    });
});
