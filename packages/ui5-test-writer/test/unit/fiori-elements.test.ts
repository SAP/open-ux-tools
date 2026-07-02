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
                hasJourneyRunnerTs?: boolean;
                hasTsconfig?: boolean;
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
                    if (p.includes('pages') && p.endsWith('JourneyRunner.ts')) {
                        return flags.hasJourneyRunnerTs ?? false;
                    }
                    if (p.endsWith('tsconfig.json')) {
                        return flags.hasTsconfig ?? false;
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
                    expect(addPathsToQUnitJsMock).toHaveBeenCalledWith(
                        expect.arrayContaining([expect.stringContaining('Journey.gen')]),
                        expect.any(String),
                        expect.anything(),
                        undefined
                    );

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

            describe('existing app with incompatible test setup (no own JourneyRunner.js)', () => {
                const incompatibleMessage =
                    '`testsuite.qunit` and `opaTests.qunit` files were not updated due to an incompatible existing test setup.';

                beforeEach(() => {
                    hasVirtualOPA5Mock.mockResolvedValue(false);
                });

                it('writes only .gen Journey/Page files when no JourneyRunner.js is present', async () => {
                    const projectDir = prepareTestFiles('LropVirtualTests');
                    readAppMock.mockResolvedValueOnce(JSON.parse(appModels.V4_MODEL));
                    mockProjectExistsSync({
                        hasIntegration: true,
                        hasJourneyRunner: false
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
            });

            describe('existing TypeScript app', () => {
                /**
                 * Realistic post-rework JourneyRunner.ts for a project with one ListReport page.
                 * Used as the splice target across the TS standalone tests.
                 */
                const EXISTING_JOURNEY_RUNNER_TS = `import JourneyRunner from "sap/fe/test/JourneyRunner";
import ListReport from "sap/fe/test/ListReport";
import CustomTravelListGenerated from "./TravelList.gen";

const runner = new JourneyRunner({
    launchUrl: sap.ui.require.toUrl("myApp") + "/test/flp.html#app-preview",
    pages: {
        onTheTravelListGenerated: new ListReport(
            {
                appId: "my.app",
                componentId: "TravelList",
                contextPath: "/Travel"
            },
            CustomTravelListGenerated
        )
    },
    async: true
});

export default runner;
`;

                /**
                 * Realistic post-rework OpaJourneyTypes.d.ts with one ListReport page wired in.
                 */
                const EXISTING_OPA_JOURNEY_TYPES = `import type Opa5 from "sap/ui/test/Opa5";
import type { actions as ListReportActions, assertions as ListReportAssertions } from "sap/fe/test/ListReport";
import type { actions as TemplatePageActions, assertions as TemplatePageAssertions } from "sap/fe/test/TemplatePage";
import type Shell from "sap/fe/test/Shell";
import type BaseArrangements from "sap/fe/test/BaseArrangements";
import type { actions as TravelListGeneratedCustomActions, assertions as TravelListGeneratedCustomAssertions } from "../pages/TravelList.gen";

export type Given = Opa5 & BaseArrangements & {
    iTearDownMyApp: () => Given;
    iStartMyApp: (sAppHash?: string, mInUrlParameters?: object) => Given;
    and: Given;
};

export type When = Opa5 & BaseArrangements & {
    onTheTravelListGenerated: Opa5 & ListReportActions & TemplatePageActions & typeof TravelListGeneratedCustomActions;
    onTheShell: Shell;
};

export type Then = Opa5 & BaseArrangements & {
    onTheTravelListGenerated: Opa5 & ListReportAssertions & TemplatePageAssertions & typeof TravelListGeneratedCustomAssertions;
    onTheShell: Shell;
};
`;

                beforeEach(() => {
                    hasVirtualOPA5Mock.mockResolvedValue(false);
                });

                it('auto-detects TypeScript from tsconfig.json and writes .ts page/journey files', async () => {
                    const projectDir = prepareTestFiles('LropNoTests');
                    readAppMock.mockResolvedValueOnce(JSON.parse(appModels.V4_MODEL));
                    mockProjectExistsSync({
                        hasIntegration: false,
                        hasJourneyRunner: false,
                        hasTsconfig: true
                    });

                    fs = await generateOPAFiles(projectDir, {}, metadata, fs, undefined, true);

                    const paths = Object.keys(fs.dump(projectDir));
                    expect(paths.some((p) => p.endsWith('TravelListJourney.gen.ts'))).toBe(true);
                    expect(paths.some((p) => p.includes('pages') && p.endsWith('TravelList.gen.ts'))).toBe(true);
                    expect(paths.some((p) => p.includes('pages') && p.endsWith('JourneyRunner.ts'))).toBe(true);
                    expect(paths.some((p) => p.endsWith('OpaJourneyTypes.d.ts'))).toBe(true);
                    // No .js Journey/Page/runner files are produced on the TS path
                    expect(paths.every((p) => !p.endsWith('TravelListJourney.gen.js'))).toBe(true);
                    expect(paths.every((p) => !(p.includes('pages') && p.endsWith('TravelList.gen.js')))).toBe(true);
                });

                it('respects explicit enableTypeScript: false even when tsconfig.json is present', async () => {
                    const projectDir = prepareTestFiles('LropNoTests');
                    readAppMock.mockResolvedValueOnce(JSON.parse(appModels.V4_MODEL));
                    mockProjectExistsSync({
                        hasIntegration: false,
                        hasJourneyRunner: false,
                        hasTsconfig: true
                    });

                    fs = await generateOPAFiles(projectDir, { enableTypeScript: false }, metadata, fs, undefined, true);

                    const paths = Object.keys(fs.dump(projectDir));
                    expect(paths.some((p) => p.endsWith('TravelListJourney.gen.js'))).toBe(true);
                    expect(paths.every((p) => !p.endsWith('TravelListJourney.gen.ts'))).toBe(true);
                    expect(paths.every((p) => !p.endsWith('OpaJourneyTypes.d.ts'))).toBe(true);
                });

                it('splices new .gen.ts page entries into the existing JourneyRunner.ts', async () => {
                    const projectDir = prepareTestFiles('LropVirtualTests');
                    readAppMock.mockResolvedValueOnce(JSON.parse(appModels.V4_MODEL));
                    mockProjectExistsSync({
                        hasIntegration: true,
                        hasJourneyRunner: false,
                        hasJourneyRunnerTs: true,
                        hasTsconfig: true
                    });
                    const runnerPath = join(projectDir, 'webapp', 'test', 'integration', 'pages', 'JourneyRunner.ts');
                    fs!.write(runnerPath, EXISTING_JOURNEY_RUNNER_TS);
                    const typesPath = join(
                        projectDir,
                        'webapp',
                        'test',
                        'integration',
                        'types',
                        'OpaJourneyTypes.d.ts'
                    );
                    fs!.write(typesPath, EXISTING_OPA_JOURNEY_TYPES);

                    fs = await generateOPAFiles(projectDir, {}, metadata, fs, undefined, true);

                    const updatedRunner = fs.read(runnerPath);
                    // Existing TravelList entry preserved
                    expect(updatedRunner).toContain('CustomTravelListGenerated');
                    // New TravelObjectPage entry spliced in
                    expect(updatedRunner).toContain(
                        'import CustomTravelObjectPageGenerated from "./TravelObjectPage.gen"'
                    );
                    expect(updatedRunner).toContain('onTheTravelObjectPageGenerated: new ObjectPage(');
                    // ObjectPage framework import added (was missing)
                    expect(updatedRunner).toContain('import ObjectPage from "sap/fe/test/ObjectPage"');
                });

                it('splices new journey type entries into the existing OpaJourneyTypes.d.ts', async () => {
                    const projectDir = prepareTestFiles('LropVirtualTests');
                    readAppMock.mockResolvedValueOnce(JSON.parse(appModels.V4_MODEL));
                    mockProjectExistsSync({
                        hasIntegration: true,
                        hasJourneyRunner: false,
                        hasJourneyRunnerTs: true,
                        hasTsconfig: true
                    });
                    const runnerPath = join(projectDir, 'webapp', 'test', 'integration', 'pages', 'JourneyRunner.ts');
                    fs!.write(runnerPath, EXISTING_JOURNEY_RUNNER_TS);
                    const typesPath = join(
                        projectDir,
                        'webapp',
                        'test',
                        'integration',
                        'types',
                        'OpaJourneyTypes.d.ts'
                    );
                    fs!.write(typesPath, EXISTING_OPA_JOURNEY_TYPES);

                    fs = await generateOPAFiles(projectDir, {}, metadata, fs, undefined, true);

                    const updatedTypes = fs.read(typesPath);
                    // Existing TravelList preserved
                    expect(updatedTypes).toContain('TravelListGeneratedCustomActions');
                    // New TravelObjectPage entries spliced into both unions and as imports
                    expect(updatedTypes).toContain('import type { actions as TravelObjectPageGeneratedCustomActions');
                    expect(updatedTypes).toContain(
                        'onTheTravelObjectPageGenerated: Opa5 & ObjectPageActions & TemplatePageActions'
                    );
                    expect(updatedTypes).toContain(
                        'onTheTravelObjectPageGenerated: Opa5 & ObjectPageAssertions & TemplatePageAssertions'
                    );
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
                        hasJourneyRunner: false
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
            expect(bookingObjPageJourneyContent).toContain('fieldGroup: "Names"');
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

        it('generates navigation cascade for v4 application with deeply-nested sub object page', async () => {
            // Extend V4_WITH_SUB_OBJECT_PAGE by hanging a third-level OP off BookingObjectPage.
            const deepAppModel = JSON.parse(appModels.V4_WITH_SUB_OBJECT_PAGE);
            deepAppModel.applicationModel.pages.BookingObjectPage.navigation = {
                _BookSupplement: { route: 'BookingSupplementObjectPage' }
            };
            deepAppModel.applicationModel.pages.BookingSupplementObjectPage = {
                pageType: 'ObjectPage',
                entitySet: 'BookingSupplement',
                contextPath: '/BookingSupplement',
                template: 'sap.fe.templates.ObjectPage',
                model: { root: { aggregations: {} } }
            };
            readAppMock.mockResolvedValueOnce(deepAppModel);
            const projectDir = prepareTestFiles('LROPv4');
            const subOPMetadata =
                fs?.read(join(__dirname, '../test-input/LROPv4/webapp/localService/mainService/metadata.xml')) ?? '';
            fs = await generateOPAFiles(projectDir, {}, subOPMetadata, fs);

            const deepJourneyContent =
                fs.dump()['test/test-output/LROPv4/webapp/test/integration/BookingSupplementObjectPageJourney.gen.js']
                    .contents;
            // Cascade must include both intermediate hops (Travel and Booking) in order
            const travelSee = deepJourneyContent.indexOf('Then.onTheTravelObjectPageGenerated.iSeeThisPage();');
            const travelCheckBooking = deepJourneyContent.indexOf(
                'onTheTravelObjectPageGenerated.onTable({ property: "_Booking" }).iCheckRows()'
            );
            const travelPressBooking = deepJourneyContent.indexOf(
                'onTheTravelObjectPageGenerated.onTable({ property: "_Booking" }).iPressRow(0)'
            );
            const bookingSee = deepJourneyContent.indexOf('Then.onTheBookingObjectPageGenerated.iSeeThisPage();');
            const bookingCheckSupplement = deepJourneyContent.indexOf(
                'onTheBookingObjectPageGenerated.onTable({ property: "_BookSupplement" }).iCheckRows()'
            );
            const bookingPressSupplement = deepJourneyContent.indexOf(
                'onTheBookingObjectPageGenerated.onTable({ property: "_BookSupplement" }).iPressRow(0)'
            );
            const targetSee = deepJourneyContent.indexOf(
                'Then.onTheBookingSupplementObjectPageGenerated.iSeeThisPage();'
            );
            expect(travelSee).toBeGreaterThan(-1);
            expect(travelCheckBooking).toBeGreaterThan(travelSee);
            expect(travelPressBooking).toBeGreaterThan(travelCheckBooking);
            expect(bookingSee).toBeGreaterThan(travelPressBooking);
            expect(bookingCheckSupplement).toBeGreaterThan(bookingSee);
            expect(bookingPressSupplement).toBeGreaterThan(bookingCheckSupplement);
            expect(targetSee).toBeGreaterThan(bookingPressSupplement);
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
                'onTheEmployeesListGenerated: Opa5 & ListReportActions & TemplatePageActions & typeof EmployeesListGeneratedCustomActions'
            );
            expect(typesContent).toContain(
                'onTheEmployeesObjectPageGenerated: Opa5 & ObjectPageActions & TemplatePageActions & typeof EmployeesObjectPageGeneratedCustomActions'
            );
            expect(typesContent).toContain(
                'onTheEmployeesObjectPageGenerated: Opa5 & ObjectPageAssertions & TemplatePageAssertions & typeof EmployeesObjectPageGeneratedCustomAssertions'
            );
            expect(typesContent).toContain('onTheShell: Shell');
            expect(typesContent).toContain('import type Opa5 from "sap/ui/test/Opa5"');
            expect(typesContent).toContain('import type { actions as ListReportActions');
            expect(typesContent).toContain('import type { actions as ObjectPageActions');
            expect(typesContent).toContain(
                'import type { actions as EmployeesObjectPageGeneratedCustomActions, assertions as EmployeesObjectPageGeneratedCustomAssertions }'
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
            const lrPagePath = Object.keys(dumped).find((p) => p.includes('pages/EmployeesList.gen.ts'));
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

            const opPagePath = Object.keys(dumped).find((p) => p.includes('pages/EmployeesObjectPage.gen.ts'));
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
            // Custom-class imports (renamed with `Custom` prefix to avoid shadowing the framework class,
            // and the `Generated` suffix to disambiguate from any user-authored hand-written page bindings)
            expect(content).toContain('import CustomEmployeesListGenerated from "./EmployeesList.gen"');
            expect(content).toContain('import CustomEmployeesObjectPageGenerated from "./EmployeesObjectPage.gen"');
            // Each page is constructed inline with the framework class + custom class
            expect(content).toContain('onTheEmployeesListGenerated: new ListReport(');
            expect(content).toContain('onTheEmployeesObjectPageGenerated: new ObjectPage(');
            expect(content).toContain('CustomEmployeesListGenerated');
            expect(content).toContain('CustomEmployeesObjectPageGenerated');
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
            // The page-definition object passed to `new ListReport(...)` should set contextPath
            // and skip entitySet entirely (only emit the field that actually applies).
            expect(content).toContain('contextPath: "/');
            expect(content).not.toContain('entitySet: ""');
        });

        it('generates TypeScript filter tests for LROPv4 app', async () => {
            readAppMock.mockResolvedValueOnce(JSON.parse(appModels.V4_MODEL));
            const projectDir = prepareTestFiles('LROPv4');
            fs = await generateOPAFiles(projectDir, { enableTypeScript: true }, metadata, fs);

            const dumped = fs.dump(projectDir);
            const lrJourneyPath = Object.keys(dumped).find((p) => p.includes('TravelListJourney.gen.ts'));
            expect(lrJourneyPath).toBeDefined();
            const lrContent = dumped[lrJourneyPath!].contents as string;

            // TS-shape filter assertions: plain string identifier (matches JS template) cast to
            // FilterFieldIdentifier to satisfy `@sapui5/types` which mistypes the parameter.
            expect(lrContent).toContain('iCheckFilterField("TravelID" as unknown as FilterFieldIdentifier)');
            expect(lrContent).toContain('iCheckFilterField("AgencyID" as unknown as FilterFieldIdentifier)');
            expect(lrContent).toContain('iCheckFilterField("Kunden ID" as unknown as FilterFieldIdentifier)');

            // TS adaptation: onTable("") instead of onTable()
            expect(lrContent).toContain('onTable("")');
            expect(lrContent).not.toContain('onTable()');

            // The TS journey is typed, no AMD wrapper. Start application uses Given + Then (When prefixed with _ as unused).
            expect(lrContent).toContain('function (Given: Given, _When: When, Then: Then)');
            expect(lrContent).not.toContain('sap.ui.define');

            // Sanity: FirstJourney is the rework's fallback and must NOT be emitted when LR/OP/FPM journeys are produced.
            const firstJourneyPath = Object.keys(dumped).find((p) => p.includes('FirstJourney.ts'));
            expect(firstJourneyPath).toBeUndefined();
        });

        it('generates TypeScript filter tests for LROPv4 app (missing semantic filter)', async () => {
            readAppMock.mockResolvedValueOnce(JSON.parse(appModels.V4_MODEL_FILTER_BAR_NO_TRAVEL_ID));
            const projectDir = prepareTestFiles('LROPv4');
            fs = await generateOPAFiles(projectDir, { enableTypeScript: true }, metadataMissingSemanticFilter, fs);

            const dumped = fs.dump(projectDir);
            const lrJourneyPath = Object.keys(dumped).find((p) => p.includes('TravelListJourney.gen.ts'));
            expect(lrJourneyPath).toBeDefined();
            const content = dumped[lrJourneyPath!].contents as string;

            // The semantic-key adaptation block is emitted with TS-shape calls
            expect(content).toContain('Add semantic key properties to filter bar');
            expect(content).toContain('iOpenFilterAdaptation()');
            expect(content).toContain('iAddAdaptationFilterField("TravelID")');
            expect(content).toContain('iConfirmFilterAdaptation()');
            expect(content).toContain('iCheckFilterField("TravelID" as unknown as FilterFieldIdentifier)');
            // Commented-out global search example uses the typed function signature
            expect(content).toContain('function (Given: Given, When: When, Then: Then)');
        });

        it('generates TypeScript column tests for LROPv4 app', async () => {
            readAppMock.mockResolvedValueOnce(JSON.parse(appModels.V4_NO_FILTER_MODEL));
            const projectDir = prepareTestFiles('LROPv4');
            fs = await generateOPAFiles(projectDir, { enableTypeScript: true }, metadata, fs);

            const dumped = fs.dump(projectDir);
            const lrJourneyPath = Object.keys(dumped).find((p) => p.includes('TravelListJourney.gen.ts'));
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
            const lrJourneyPath = Object.keys(dumped).find((p) => p.includes('TravelListJourney.gen.ts'));
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
            const lrJourneyPath = Object.keys(dumped).find((p) => p.includes('TravelListJourney.gen.ts'));
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
            const opJourneyPath = Object.keys(dumped).find((p) => p.includes('BookingObjectPageJourney.gen.ts'));
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
            expect(content).toContain('fieldGroup: "Names"');
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

    describe('generateOPAFiles FPM forces JavaScript', () => {
        const metadata = readFileSync(join(__dirname, '../fixtures/metadata.xml')).toString();

        it('generates .js files when app has an FPM page and enableTypeScript is true', async () => {
            const projectDir = prepareTestFiles('CustomOP');
            fs = await generateOPAFiles(projectDir, { enableTypeScript: true }, metadata, fs);

            const paths = Object.keys(fs.dump(projectDir));
            const integrationFiles = paths.filter(
                (p) => p.includes('integration/') && !p.includes('opaTests.qunit') && !p.includes('OpaJourneyTypes')
            );
            for (const file of integrationFiles) {
                expect(file).toMatch(/\.js$/);
            }
            expect(paths.some((p) => p.endsWith('.ts') && p.includes('integration/'))).toBe(false);
            expect(paths.some((p) => p.includes('OpaJourneyTypes.d.ts'))).toBe(false);
        });

        it('generates .js files when app has an FPM page and tsconfig.json exists in standalone mode', async () => {
            const realExistsSync = actualFs.existsSync;
            const projectDir = prepareTestFiles('CustomOP');
            hasVirtualOPA5Mock.mockResolvedValue(false);
            existsSyncMock.mockImplementation((p: string) => {
                if (p.endsWith('tsconfig.json')) {
                    return true;
                }
                if (p.includes('test-output') && p.includes('JourneyRunner')) {
                    return false;
                }
                if (p.includes('test-output') && p.endsWith('integration')) {
                    return false;
                }
                return realExistsSync(p);
            });

            fs = await generateOPAFiles(projectDir, {}, metadata, fs, undefined, true);

            const paths = Object.keys(fs.dump(projectDir));
            const integrationFiles = paths.filter(
                (p) =>
                    p.includes('integration/') &&
                    !p.includes('opaTests.qunit') &&
                    !p.includes('OpaJourneyTypes') &&
                    !p.includes('integration_old')
            );
            for (const file of integrationFiles) {
                expect(file).toMatch(/\.js$/);
            }
            expect(paths.some((p) => p.includes('OpaJourneyTypes.d.ts'))).toBe(false);

            hasVirtualOPA5Mock.mockReset();
            existsSyncMock.mockImplementation(actualFs.existsSync);
        });

        afterEach(() => {
            hasVirtualOPA5Mock.mockReset();
            existsSyncMock.mockImplementation(actualFs.existsSync);
        });
    });
});
