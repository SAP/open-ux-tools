import { generateOPAFiles, generatePageObjectFile } from '../../src/fiori-elements-opa-writer';
import { join } from 'node:path';
import type { Editor } from 'mem-fs-editor';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import fileSystem, { read } from 'node:fs';
import type { Logger } from '@sap-ux/logger/src/types';
import * as appModels from '../test-input/constants';

const readAppMock = jest.fn();
jest.mock('@sap-ux/project-access', () => ({
    ...(jest.requireActual('@sap-ux/project-access') as any),
    createApplicationAccess: jest.fn().mockResolvedValue({
        getSpecification: jest.fn().mockResolvedValue({
            readApp: () => readAppMock()
        })
    })
}));

const existsSyncMock = jest.fn();
jest.mock('node:fs', () => {
    const actual = jest.requireActual('node:fs') as object;
    return {
        ...actual,
        existsSync: (...args: unknown[]) => existsSyncMock(...args)
    };
});

const hasVirtualOPA5Mock = jest.fn();
const addPathsToQUnitJsMock = jest.fn();
jest.mock('../../src/utils/opaQUnitUtils', () => ({
    ...(jest.requireActual('../../src/utils/opaQUnitUtils') as object),
    hasVirtualOPA5: (...args: unknown[]) => hasVirtualOPA5Mock(...args),
    addPathsToQUnitJs: (...args: unknown[]) => addPathsToQUnitJsMock(...args)
}));

const loadServiceMetadataMock = jest.fn();
jest.mock('../../src/utils/xmlMetadataUtils', () => ({
    ...(jest.requireActual('../../src/utils/xmlMetadataUtils') as object),
    loadServiceMetadata: (...args: unknown[]) => loadServiceMetadataMock(...args)
}));

describe('ui5-test-writer', () => {
    let fs: Editor | undefined;
    const debug = !!process.env['UX_DEBUG'];
    jest.setTimeout(600000);

    beforeAll(() => {
        // Pass existsSync and addPathsToQUnitJs through to real implementations by default
        const realExistsSync: typeof existsSyncMock = jest.requireActual<{
            existsSync: typeof existsSyncMock;
        }>('node:fs').existsSync;
        existsSyncMock.mockImplementation(realExistsSync);

        const { addPathsToQUnitJs: realAddPaths } = jest.requireActual<{
            addPathsToQUnitJs: typeof addPathsToQUnitJsMock;
        }>('../../src/utils/opaQUnitUtils');
        addPathsToQUnitJsMock.mockImplementation(realAddPaths);
    });

    beforeEach(() => {
        loadServiceMetadataMock.mockReset();
        loadServiceMetadataMock.mockResolvedValue(undefined);
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

    describe('generatePageObjectFile', () => {
        const testPages = [
            {
                description: 'ListReport',
                targetKey: 'EmployeesListTarget'
            },
            {
                description: 'Object Page',
                targetKey: 'EmployeesObjectPageTarget'
            },
            {
                description: 'FPM custom',
                targetKey: 'EmployeesCustomPageTarget'
            }
        ];
        const testUnsupportedPages = [
            {
                description: 'Another component view (not supported)',
                targetKey: 'AnotherCustomPageTarget',
                errorMsg: 'Validation error: Cannot generate the page file for target: AnotherCustomPageTarget.'
            },
            {
                description: 'Plain XML view (not supported)',
                targetKey: 'XMLView',
                errorMsg: 'Validation error: Cannot generate the page file for target: XMLView.'
            },
            {
                description: 'Missing ID',
                targetKey: 'NoID',
                errorMsg: 'Validation error: Cannot generate the page file for target: NoID.'
            },
            {
                description: 'Missing entityset',
                targetKey: 'NoEntitySet',
                errorMsg: 'Validation error: Cannot generate the page file for target: NoEntitySet.'
            },
            {
                description: 'Bad target',
                targetKey: 'XXX',
                errorMsg: 'Validation error: Cannot generate the page file for target: XXX.'
            }
        ];

        it.each(testPages)('$description', async (config) => {
            const projectDir = prepareTestFiles('Pages');
            fs = await generatePageObjectFile(projectDir, { targetKey: config.targetKey }, fs);
            expect(fs.dump(projectDir)).toMatchSnapshot();
        });

        it.each(testUnsupportedPages)('$description', async (config) => {
            const projectDir = prepareTestFiles('Pages');
            let error: string | undefined;
            try {
                fs = await generatePageObjectFile(projectDir, { targetKey: config.targetKey }, fs);
            } catch (e) {
                error = (e as Error).message;
            }

            expect(error).toEqual(config.errorMsg);
        });

        it('No manifest', async () => {
            const projectDir = prepareTestFiles('Not_Here');
            let error: string | undefined;
            try {
                fs = await generatePageObjectFile(projectDir, { targetKey: 'xx' }, fs);
            } catch (e) {
                error = (e as Error).message;
            }

            expect(error?.startsWith('Validation error: Cannot read the `manifest.json` file:')).toEqual(true);
        });

        it('Providing an app ID', async () => {
            const projectDir = prepareTestFiles('Pages');
            fs = await generatePageObjectFile(
                projectDir,
                { targetKey: 'EmployeesListTarget', appID: 'test.ui5-test-writer' },
                fs
            );
            expect(fs.dump(projectDir)).toMatchSnapshot();
        });
    });

    describe('generateOPAFiles', () => {
        const metadata = fs?.read(join(__dirname, '../test-input/metadata.xml')) || '';
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

            beforeAll(() => {
                realExistsSync = jest.requireActual<{ existsSync: (path: string) => boolean }>('node:fs').existsSync;
            });

            beforeEach(() => {
                hasVirtualOPA5Mock.mockResolvedValue(true);
            });

            afterEach(() => {
                hasVirtualOPA5Mock.mockReset();
                // Restore pass-through so subsequent tests are unaffected
                existsSyncMock.mockImplementation(realExistsSync);
                const { addPathsToQUnitJs: realAddPaths } = jest.requireActual<{
                    addPathsToQUnitJs: typeof addPathsToQUnitJsMock;
                }>('../../src/utils/opaQUnitUtils');
                addPathsToQUnitJsMock.mockImplementation(realAddPaths);
            });

            it('generates journey files but skips opaTests.qunit.js when OPA5 is configured in yaml and JourneyRunner exists', async () => {
                const projectDir = prepareTestFiles('LropVirtualTests');
                // Simulate JourneyRunner.js existing on disk
                existsSyncMock.mockReturnValue(true);
                fs = await generateOPAFiles(projectDir, {}, metadata, fs, undefined, true);

                expect(fs.dump(projectDir)).toMatchSnapshot();
            });

            it('moves integration folder and skips common/page files when OPA5 is configured and no JourneyRunner', async () => {
                const projectDir = prepareTestFiles('LropVirtualTests');
                // Return false only for the test output JourneyRunner check (not template paths)
                existsSyncMock.mockImplementation((p: string) =>
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
                realExistsSync = jest.requireActual<{ existsSync: (path: string) => boolean }>('node:fs').existsSync;
            });

            beforeEach(() => {
                hasVirtualOPA5Mock.mockResolvedValue(false);
            });

            afterEach(() => {
                hasVirtualOPA5Mock.mockReset();
                existsSyncMock.mockImplementation(realExistsSync);
                const { addPathsToQUnitJs: realAddPaths } = jest.requireActual<{
                    addPathsToQUnitJs: typeof addPathsToQUnitJsMock;
                }>('../../src/utils/opaQUnitUtils');
                addPathsToQUnitJsMock.mockImplementation(realAddPaths);
            });

            it('moves integration folder and writes common/page/journey files when no JourneyRunner and OPA5 not virtual', async () => {
                const projectDir = prepareTestFiles('LropVirtualTests');
                // Return false only for the test output JourneyRunner check (not template paths)
                existsSyncMock.mockImplementation((p: string) =>
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
                existsSyncMock.mockImplementation((p: string) =>
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
                existsSyncMock.mockImplementation((p: string) => {
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
                existsSyncMock.mockImplementation((p: string) => {
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
                existsSyncMock.mockImplementation((p: string) =>
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
                existsSyncMock.mockImplementation((p: string) => {
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

        it('generates tests for v4 application with sub object page', async () => {
            readAppMock.mockResolvedValueOnce(JSON.parse(appModels.V4_WITH_SUB_OBJECT_PAGE));
            const projectDir = prepareTestFiles('LROPv4');
            fs = await generateOPAFiles(projectDir, {}, metadata, fs);

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
            expect(bookingObjPageJourneyContent).toContain('iCheckNumberOfSections(3)');
            expect(bookingObjPageJourneyContent).toContain('iPressSectionIconTabFilterButton("BookingDetails")');
            expect(bookingObjPageJourneyContent).toContain('iCheckSection({ section: "BookingDetails" })');
            expect(bookingObjPageJourneyContent).toContain('iCheckSubSection({ section: "BookingData" })');
            expect(bookingObjPageJourneyContent).toContain('iCheckSubSection({ section: "AdministrativeData" })');
            expect(bookingObjPageJourneyContent).toContain('iPressSectionIconTabFilterButton("FlightData")');
            expect(bookingObjPageJourneyContent).toContain('iCheckSection({ section: "FlightData" })');
            expect(bookingObjPageJourneyContent).toContain('iPressSectionIconTabFilterButton("PriceData")');
            expect(bookingObjPageJourneyContent).toContain('iCheckSection({ section: "PriceData" })');
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

        it('emits the chartId/chartType identifier when metadata resolves the chart type', async () => {
            readAppMock.mockResolvedValueOnce(JSON.parse(appModels.V4_WITH_SUB_OBJECT_PAGE));
            loadServiceMetadataMock.mockResolvedValueOnce({
                entitySets: [
                    {
                        name: 'Booking',
                        entityType: {
                            navigationProperties: [],
                            annotations: {
                                UI: {
                                    'Chart#SupplementPrice': {
                                        term: 'com.sap.vocabularies.UI.v1.Chart',
                                        ChartType: 'UI.ChartType/Line'
                                    }
                                }
                            }
                        }
                    }
                ]
            });
            const projectDir = prepareTestFiles('LROPv4');
            fs = await generateOPAFiles(projectDir, {}, metadata, fs);

            const bookingObjPageJourneyContent =
                fs.dump()['test/test-output/LROPv4/webapp/test/integration/BookingObjectPageJourney.js'].contents;
            expect(bookingObjPageJourneyContent).toContain(
                'iCheckMicroChart({ chartId: "Chart::SupplementPrice", chartType: "LineMicroChart" })'
            );
            expect(bookingObjPageJourneyContent).not.toContain('iCheckMicroChart("Supplement Price")');
        });

        it('skips assertions for sections marked UI.Hidden in metadata', async () => {
            readAppMock.mockResolvedValueOnce(JSON.parse(appModels.V4_WITH_SUB_OBJECT_PAGE));
            loadServiceMetadataMock.mockResolvedValueOnce({
                entitySets: [
                    {
                        name: 'Booking',
                        entityType: {
                            navigationProperties: [],
                            annotations: {
                                UI: {
                                    HeaderFacets: [
                                        {
                                            $Type: 'com.sap.vocabularies.UI.v1.ReferenceFacet',
                                            Target: { value: 'com.sap.vocabularies.UI.v1.Chart#SupplementPrice' },
                                            annotations: { UI: { Hidden: true } }
                                        }
                                    ],
                                    Facets: [
                                        {
                                            $Type: 'com.sap.vocabularies.UI.v1.CollectionFacet',
                                            ID: 'FlightData',
                                            Facets: [],
                                            annotations: { UI: { Hidden: true } }
                                        },
                                        {
                                            $Type: 'com.sap.vocabularies.UI.v1.CollectionFacet',
                                            ID: 'PriceData',
                                            Facets: [],
                                            annotations: { UI: { Hidden: { $Path: 'isHiddenProp' } } }
                                        }
                                    ]
                                }
                            }
                        }
                    }
                ]
            });
            const projectDir = prepareTestFiles('LROPv4');
            fs = await generateOPAFiles(projectDir, {}, metadata, fs);

            const bookingObjPageJourneyContent =
                fs.dump()['test/test-output/LROPv4/webapp/test/integration/BookingObjectPageJourney.js'].contents;
            // Hidden=true header facet emits a skip comment, no actual assertion
            expect(bookingObjPageJourneyContent).toContain(
                '// Test skipped for header facet "Chart::SupplementPrice" - UI.Hidden annotation is set to true'
            );
            expect(bookingObjPageJourneyContent).not.toMatch(/^\s*Then\.[^/]*iCheckMicroChart/m);
            // Hidden=true body section emits a skip comment, no actual assertion
            expect(bookingObjPageJourneyContent).toContain(
                '// Test skipped for body section "FlightData" - UI.Hidden annotation is set to true'
            );
            expect(bookingObjPageJourneyContent).not.toMatch(
                /^\s*Then\.[^/]*iCheckSection\(\{ section: "FlightData" \}\)/m
            );
            // Dynamic Hidden body section emits an explanation + commented-out assertion
            expect(bookingObjPageJourneyContent).toContain(
                '// Test skipped for body section "PriceData" - UI.Hidden annotation is an expression which the generator is unable to resolve.'
            );
            expect(bookingObjPageJourneyContent).toContain(
                '// Then.onTheBookingObjectPage.iCheckSection({ section: "PriceData" });'
            );
            expect(bookingObjPageJourneyContent).not.toMatch(
                /^\s*Then\.[^/]*iCheckSection\(\{ section: "PriceData" \}\)/m
            );
            // Visible body section is still asserted
            expect(bookingObjPageJourneyContent).toMatch(
                /^\s*Then\.[^/]*iCheckSection\(\{ section: "BookingDetails" \}\)/m
            );
            // Section count reflects only renderable sections (FlightData hidden=true is excluded; PriceData dynamic is included)
            expect(bookingObjPageJourneyContent).toContain('iCheckNumberOfSections(2)');
        });
    });
});
