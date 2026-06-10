import { jest } from '@jest/globals';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Editor } from 'mem-fs-editor';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import fileSystem, { readFileSync } from 'node:fs';
import type { Logger } from '@sap-ux/logger';
import * as appModels from '../test-input/constants.js';
const __dirname = dirname(fileURLToPath(import.meta.url));

const realProjectAccess = await import('@sap-ux/project-access');
const readAppMock = jest.fn<() => Promise<unknown>>();
jest.unstable_mockModule('@sap-ux/project-access', () => ({
    ...realProjectAccess,
    createApplicationAccess: jest.fn<() => Promise<unknown>>().mockResolvedValue({
        getSpecification: jest.fn<() => Promise<unknown>>().mockResolvedValue({
            readApp: () => readAppMock()
        })
    })
}));

const actualFs = await import('node:fs');
const existsSyncMock = jest.fn<typeof actualFs.existsSync>();
jest.unstable_mockModule('node:fs', () => ({
    ...actualFs,
    existsSync: existsSyncMock
}));

const actualVirtualOpaUtils = await import('../../src/utils/virtualOpaUtils.js');
const hasVirtualOPA5Mock = jest.fn<typeof actualVirtualOpaUtils.hasVirtualOPA5>();
jest.unstable_mockModule('../../src/utils/virtualOpaUtils.js', () => ({
    ...actualVirtualOpaUtils,
    hasVirtualOPA5: hasVirtualOPA5Mock
}));

const actualOpaQUnitUtils = await import('../../src/utils/opaQUnitUtils.js');
const addPathsToQUnitJsMock = jest.fn<typeof actualOpaQUnitUtils.addPathsToQUnitJs>();
jest.unstable_mockModule('../../src/utils/opaQUnitUtils.js', () => ({
    ...actualOpaQUnitUtils,
    addPathsToQUnitJs: addPathsToQUnitJsMock
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
            const travelListJourneyContent =
                fs.dump()['test/test-output/Worklistv4/webapp/test/integration/TravelListJourney.gen.js'].contents;
            expect(travelListJourneyContent).not.toContain('iCheckFilterField');
        });

        it('generates filter tests for LROPv4 app', async () => {
            readAppMock.mockResolvedValueOnce(JSON.parse(appModels.V4_MODEL));
            const projectDir = prepareTestFiles('LROPv4');
            fs = await generateOPAFiles(projectDir, {}, metadata, fs);

            expect(fs.dump(projectDir)).toMatchSnapshot();
            const firstJourneyContent =
                fs.dump()['test/test-output/LROPv4/webapp/test/integration/TravelListJourney.gen.js'].contents;
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
                fs.dump()['test/test-output/LROPv4/webapp/test/integration/TravelListJourney.gen.js'].contents;
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
                info: jest.fn(),
                warn: jest.fn()
            };

            fs = await generateOPAFiles(projectDir, {}, metadata, fs, mockLogger as unknown as Logger);

            const firstJourneyContent =
                fs.dump()['test/test-output/LROPv4NoFilters/webapp/test/integration/TravelListJourney.gen.js'].contents;
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
                info: jest.fn(),
                warn: jest.fn()
            };

            fs = await generateOPAFiles(projectDir, {}, metadata, fs, mockLogger as unknown as Logger);

            const firstJourneyContent =
                fs.dump()['test/test-output/LROPv4NoColumns/webapp/test/integration/TravelListJourney.gen.js'].contents;
            expect(firstJourneyContent).toContain('iCheckFilterField');
            expect(firstJourneyContent).not.toContain('iCheckColumns');
            expect(mockLogger.warn).toHaveBeenCalledWith(
                expect.stringContaining(
                    'Unable to extract table columns from project model using specification. No table column tests will be generated.'
                )
            );
        });

        describe('standalone mode for existing app', () => {
            let realExistsSync: typeof actualFs.existsSync;

            beforeAll(() => {
                realExistsSync = actualFs.existsSync;
            });

            afterEach(() => {
                hasVirtualOPA5Mock.mockReset();
                existsSyncMock.mockImplementation(realExistsSync);
                addPathsToQUnitJsMock.mockReset();
                addPathsToQUnitJsMock.mockImplementation(actualOpaQUnitUtils.addPathsToQUnitJs);
            });

            // Helper that mocks node:fs.existsSync for the writer's existing-test-setup detection.
            // Any path NOT under test-output falls through to the real implementation
            // so template files keep resolving.
            function mockProjectExistsSync(flags: {
                hasIntegration: boolean;
                hasJourneyRunner: boolean;
                hasAllJourneysJson?: boolean;
                hasOpaTestsQunitJs?: boolean;
                hasFlpSandbox?: boolean;
            }): void {
                existsSyncMock.mockImplementation((rawPath) => {
                    const p = String(rawPath);
                    if (!p.includes('test-output')) {
                        return realExistsSync(rawPath);
                    }
                    if (p.includes('pages') && p.endsWith('JourneyRunner.js')) {
                        return flags.hasJourneyRunner;
                    }
                    if (p.endsWith('AllJourneys.json')) {
                        return flags.hasAllJourneysJson ?? false;
                    }
                    if (p.endsWith('opaTests.qunit.js')) {
                        return flags.hasOpaTestsQunitJs ?? false;
                    }
                    if (p.endsWith('flpSandbox.html')) {
                        return flags.hasFlpSandbox ?? false;
                    }
                    if (p.endsWith('integration')) {
                        return flags.hasIntegration;
                    }
                    return realExistsSync(p);
                });
            }

            describe('existing app with no integration folder', () => {
                beforeEach(() => {
                    hasVirtualOPA5Mock.mockResolvedValue(false);
                });

                it('writes everything, adds int-test, resolves htmlTarget from flpSandbox.html', async () => {
                    const projectDir = prepareTestFiles('LropNoTests');
                    readAppMock.mockResolvedValueOnce(JSON.parse(appModels.V4_MODEL));
                    mockProjectExistsSync({
                        hasIntegration: false,
                        hasJourneyRunner: false,
                        hasFlpSandbox: true
                    });

                    fs = await generateOPAFiles(projectDir, {}, metadata, fs, undefined, true);

                    const dumped = fs.dump(projectDir);
                    const paths = Object.keys(dumped);

                    // Journey/Page files written with .gen suffix
                    expect(paths.some((p) => p.endsWith('TravelListJourney.gen.js'))).toBe(true);
                    expect(paths.some((p) => p.includes('pages') && p.endsWith('TravelList.gen.js'))).toBe(true);
                    // JourneyRunner.js written without .gen suffix (user-extendable)
                    expect(paths.some((p) => p.includes('pages') && p.endsWith('JourneyRunner.js'))).toBe(true);
                    // qunit harness + testsuite are produced
                    expect(paths.some((p) => p.endsWith('opaTests.qunit.js'))).toBe(true);
                    expect(paths.some((p) => p.endsWith('opaTests.qunit.html'))).toBe(true);
                    expect(paths.some((p) => p.endsWith('testsuite.qunit.html'))).toBe(true);

                    // int-test script added
                    const pkgPath = paths.find((p) => p.endsWith('package.json'));
                    expect(pkgPath).toBeDefined();
                    const pkg = JSON.parse(dumped[pkgPath!].contents as string);
                    expect(pkg.scripts['int-test']).toContain('opaTests.qunit.html');
                });

                it('preserves an existing int-test script in package.json', async () => {
                    const projectDir = prepareTestFiles('LropNoTests');
                    mockProjectExistsSync({
                        hasIntegration: false,
                        hasJourneyRunner: false,
                        hasFlpSandbox: false
                    });

                    const pkgPath = join(projectDir, 'package.json');
                    const pkg = JSON.parse(fs!.read(pkgPath));
                    const existingScript = 'fiori run --existing';
                    pkg.scripts['int-test'] = existingScript;
                    fs!.write(pkgPath, JSON.stringify(pkg));

                    fs = await generateOPAFiles(projectDir, {}, metadata, fs, undefined, true);

                    const dumped = fs.dump(projectDir);
                    const writtenPkgPath = Object.keys(dumped).find((p) => p.endsWith('package.json'));
                    const writtenPkg = JSON.parse(dumped[writtenPkgPath!].contents as string);
                    expect(writtenPkg.scripts['int-test']).toBe(existingScript);
                });
            });

            describe('existing app with compatible test setup (own JourneyRunner.js present)', () => {
                beforeEach(() => {
                    hasVirtualOPA5Mock.mockResolvedValue(false);
                });

                it('writes .gen files alongside user files and splices into existing JourneyRunner/qunit', async () => {
                    const projectDir = prepareTestFiles('LropVirtualTests');
                    readAppMock.mockResolvedValueOnce(JSON.parse(appModels.V4_MODEL));
                    mockProjectExistsSync({
                        hasIntegration: true,
                        hasJourneyRunner: true
                    });
                    addPathsToQUnitJsMock.mockImplementation(jest.fn());
                    const moveSpy = jest.spyOn(fs!, 'move');

                    fs = await generateOPAFiles(projectDir, {}, metadata, fs, undefined, true);

                    const dumped = fs.dump(projectDir);
                    const paths = Object.keys(dumped);

                    // .gen page/journey files are written
                    expect(paths.some((p) => p.endsWith('TravelListJourney.gen.js'))).toBe(true);
                    expect(paths.some((p) => p.includes('pages') && p.endsWith('TravelList.gen.js'))).toBe(true);
                    // No fresh opaTests.qunit.* / testsuite.qunit.* (compatible existing setup)
                    expect(paths.every((p) => !p.endsWith('opaTests.qunit.js'))).toBe(true);
                    expect(paths.every((p) => !p.endsWith('opaTests.qunit.html'))).toBe(true);
                    expect(paths.every((p) => !p.endsWith('testsuite.qunit.html'))).toBe(true);
                    // No legacy integration_old move
                    expect(moveSpy).not.toHaveBeenCalledWith(
                        expect.stringContaining('integration'),
                        expect.stringContaining('integration_old')
                    );
                    // qunit module paths (with .gen) get spliced into the existing opaTests.qunit.js
                    expect(addPathsToQUnitJsMock).toHaveBeenCalled();
                    const splicedPaths = addPathsToQUnitJsMock.mock.calls[0][0] as string[];
                    expect(splicedPaths.some((p) => p.includes('Journey.gen'))).toBe(true);

                    moveSpy.mockRestore();
                });

                it('does not invoke the FirstJourney template when no journeys are produced', async () => {
                    const projectDir = prepareTestFiles('LropVirtualTests');
                    // Empty model → no LR/OP/FPM journeys
                    readAppMock.mockResolvedValueOnce({});
                    mockProjectExistsSync({
                        hasIntegration: true,
                        hasJourneyRunner: true
                    });
                    addPathsToQUnitJsMock.mockImplementation(jest.fn());
                    const copyTplSpy = jest.spyOn(fs!, 'copyTpl');

                    fs = await generateOPAFiles(projectDir, {}, metadata, fs, undefined, true);

                    // FirstJourney template must not be rendered when a compatible test setup already exists
                    const firstJourneyCalls = copyTplSpy.mock.calls.filter(
                        (call) => typeof call[0] === 'string' && call[0].endsWith('FirstJourney.js')
                    );
                    expect(firstJourneyCalls).toHaveLength(0);
                    copyTplSpy.mockRestore();
                });
            });

            describe('existing app with incompatible test setup (no own JourneyRunner.js, AllJourneys.json or JourneyRunner reference in opaTests.qunit.js)', () => {
                const incompatibleMessage =
                    'testsuite.qunit and opaTest.qunit files were not updated due to an incompatible existing test setup.';

                beforeEach(() => {
                    hasVirtualOPA5Mock.mockResolvedValue(false);
                });

                it('writes only .gen Journey/Page files when AllJourneys.json signals legacy setup', async () => {
                    const projectDir = prepareTestFiles('LropVirtualTests');
                    readAppMock.mockResolvedValueOnce(JSON.parse(appModels.V4_MODEL));
                    mockProjectExistsSync({
                        hasIntegration: true,
                        hasJourneyRunner: false,
                        hasAllJourneysJson: true
                    });
                    addPathsToQUnitJsMock.mockImplementation(jest.fn());
                    const log = { info: jest.fn(), warn: jest.fn() } as unknown as Logger;
                    const copyTplSpy = jest.spyOn(fs!, 'copyTpl');

                    fs = await generateOPAFiles(projectDir, {}, metadata, fs, log, true);

                    const renderedTargets = copyTplSpy.mock.calls.map(
                        (call) => (typeof call[1] === 'string' ? call[1] : '') as string
                    );
                    // Generated .gen Journey/Page files were rendered
                    expect(renderedTargets.some((p) => p.endsWith('TravelListJourney.gen.js'))).toBe(true);
                    expect(renderedTargets.some((p) => p.endsWith('TravelList.gen.js'))).toBe(true);
                    // No JourneyRunner.js, opaTests.qunit.*, or testsuite.qunit.* were rendered
                    expect(renderedTargets.every((p) => !p.endsWith('JourneyRunner.js'))).toBe(true);
                    expect(renderedTargets.every((p) => !p.endsWith('opaTests.qunit.js'))).toBe(true);
                    expect(renderedTargets.every((p) => !p.endsWith('opaTests.qunit.html'))).toBe(true);
                    // Splice helper is not invoked
                    expect(addPathsToQUnitJsMock).not.toHaveBeenCalled();
                    // Informational log is emitted
                    expect(log.info).toHaveBeenCalledWith(incompatibleMessage);

                    copyTplSpy.mockRestore();
                });

                it('detects legacy setup via JourneyRunner reference in opaTests.qunit.js', async () => {
                    const projectDir = prepareTestFiles('LropVirtualTests');
                    readAppMock.mockResolvedValueOnce(JSON.parse(appModels.V4_MODEL));
                    mockProjectExistsSync({
                        hasIntegration: true,
                        hasJourneyRunner: false,
                        hasOpaTestsQunitJs: true
                    });
                    // The detection helper reads from `<basePath>/test/integration/opaTests.qunit.js`
                    // (note: not via getWebappPath — this matches the writer's current path).
                    fs!.write(
                        join(projectDir, 'test', 'integration', 'opaTests.qunit.js'),
                        '// uses JourneyRunner from sap.fe.test\n'
                    );
                    addPathsToQUnitJsMock.mockImplementation(jest.fn());
                    const log = { info: jest.fn(), warn: jest.fn() } as unknown as Logger;

                    fs = await generateOPAFiles(projectDir, {}, metadata, fs, log, true);

                    expect(addPathsToQUnitJsMock).not.toHaveBeenCalled();
                    expect(log.info).toHaveBeenCalledWith(incompatibleMessage);
                });
            });

            describe('virtual OPA5', () => {
                beforeEach(() => {
                    hasVirtualOPA5Mock.mockResolvedValue(true);
                });

                it('skips opaTests.qunit.* writes and adds OPA5 framework config in compatible setup', async () => {
                    const projectDir = prepareTestFiles('LropVirtualTests');
                    mockProjectExistsSync({
                        hasIntegration: true,
                        hasJourneyRunner: true
                    });

                    fs = await generateOPAFiles(projectDir, {}, metadata, fs, undefined, true);

                    expect(fs.dump(projectDir)).toMatchSnapshot();
                });

                it('writes only .gen Journey/Page files in incompatible setup', async () => {
                    const projectDir = prepareTestFiles('LropVirtualTests');
                    readAppMock.mockResolvedValueOnce(JSON.parse(appModels.V4_MODEL));
                    mockProjectExistsSync({
                        hasIntegration: true,
                        hasJourneyRunner: false,
                        hasAllJourneysJson: true
                    });
                    const copyTplSpy = jest.spyOn(fs!, 'copyTpl');

                    fs = await generateOPAFiles(projectDir, {}, metadata, fs, undefined, true);

                    const renderedTargets = copyTplSpy.mock.calls.map(
                        (call) => (typeof call[1] === 'string' ? call[1] : '') as string
                    );
                    expect(renderedTargets.some((p) => p.endsWith('TravelListJourney.gen.js'))).toBe(true);
                    expect(renderedTargets.every((p) => !p.endsWith('opaTests.qunit.js'))).toBe(true);
                    expect(renderedTargets.every((p) => !p.endsWith('opaTests.qunit.html'))).toBe(true);
                    copyTplSpy.mockRestore();
                });
            });
        });

        it('generates tests for v4 application with sub object page', async () => {
            readAppMock.mockResolvedValueOnce(JSON.parse(appModels.V4_WITH_SUB_OBJECT_PAGE));
            const projectDir = prepareTestFiles('LROPv4');
            const subOPMetadata =
                fs?.read(join(__dirname, '../test-input/LROPv4/webapp/localService/mainService/metadata.xml')) ?? '';
            fs = await generateOPAFiles(projectDir, {}, subOPMetadata, fs);

            const bookingObjPageJourneyContent =
                fs.dump()['test/test-output/LROPv4/webapp/test/integration/BookingObjectPageJourney.gen.js'].contents;
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
});
