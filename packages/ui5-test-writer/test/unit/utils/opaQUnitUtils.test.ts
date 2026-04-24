import {
    addPathsToQUnitJs,
    addPagesToJourneyRunner,
    spliceModulesIntoQUnitContent,
    splicePageIntoJourneyRunner,
    readHtmlTargetFromQUnitJs,
    addIntegrationOldToGitignore,
    hasVirtualOPA5
} from '../../../src/utils/opaQUnitUtils';
import { join } from 'node:path';
import type { Editor } from 'mem-fs-editor';
import { getAllUi5YamlFileNames, readUi5Yaml } from '@sap-ux/project-access';

jest.mock('@sap-ux/project-access', () => ({
    getAllUi5YamlFileNames: jest.fn(),
    readUi5Yaml: jest.fn()
}));

/**
 * Matches the actual template output: the last entry has no trailing newline
 * before the closing `]`, i.e. the array body does NOT end with `\n`.
 */
const TEMPLATE_FILE = `sap.ui.require(
  [
    "sap/ui/thirdparty/qunit-2",
    "myApp/test/integration/FirstJourney",
    "myApp/test/integration/TravelListJourney",], function (QUnit) {
    QUnit.start();
});
`;

/** Minimal realistic opaTests.qunit.js as produced by the template */
const BASE_FILE = `sap.ui.loader.config({
    shim: {
        "sap/ui/qunit/qunit-junit": {
            deps: ["sap/ui/thirdparty/qunit-2"]
        },
        "sap/ui/qunit/qunit-coverage": {
            deps: ["sap/ui/thirdparty/qunit-2"]
        },
        "sap/ui/thirdparty/sinon-qunit": {
            deps: ["sap/ui/thirdparty/qunit-2", "sap/ui/thirdparty/sinon"]
        },
        "sap/ui/qunit/sinon-qunit-bridge": {
            deps: ["sap/ui/thirdparty/qunit-2", "sap/ui/thirdparty/sinon-4"]
        }
    }
});

window.QUnit = Object.assign({}, window.QUnit, { config: { autostart: false } });

sap.ui.require(
  [
    "sap/ui/thirdparty/qunit-2",
    "sap/ui/qunit/qunit-junit",
    "sap/ui/qunit/qunit-coverage",
    "myApp/test/integration/FirstJourney",
    "myApp/test/integration/TravelListJourney",
], function (QUnit) {
    "use strict";
    QUnit.start();
});
`;

describe('spliceModulesIntoQUnitContent()', () => {
    test('adds a new module to the require array', () => {
        const result = spliceModulesIntoQUnitContent(BASE_FILE, ['myApp/test/integration/NewJourney']);

        expect(result).toContain('"myApp/test/integration/NewJourney",');
        // New entry appears before the closing bracket
        const newEntryIdx = result.indexOf('"myApp/test/integration/NewJourney"');
        const closingBracketIdx = result.indexOf('], function');
        expect(newEntryIdx).toBeLessThan(closingBracketIdx);
    });

    test('adds multiple new modules', () => {
        const result = spliceModulesIntoQUnitContent(BASE_FILE, [
            'myApp/test/integration/JourneyA',
            'myApp/test/integration/JourneyB'
        ]);

        expect(result).toContain('"myApp/test/integration/JourneyA",');
        expect(result).toContain('"myApp/test/integration/JourneyB",');
    });

    test('skips modules that are already present', () => {
        const result = spliceModulesIntoQUnitContent(BASE_FILE, ['myApp/test/integration/TravelListJourney']);

        // Content must be identical — nothing was added
        expect(result).toBe(BASE_FILE);
    });

    test('adds only the new modules when some already exist', () => {
        const result = spliceModulesIntoQUnitContent(BASE_FILE, [
            'myApp/test/integration/TravelListJourney', // already present
            'myApp/test/integration/NewJourney' // new
        ]);

        expect(result).toContain('"myApp/test/integration/NewJourney",');
        // Existing entry must not be duplicated
        const occurrences = (result.match(/"myApp\/test\/integration\/TravelListJourney"/g) ?? []).length;
        expect(occurrences).toBe(1);
    });

    test('returns the file unchanged when the module list is empty', () => {
        const result = spliceModulesIntoQUnitContent(BASE_FILE, []);
        expect(result).toBe(BASE_FILE);
    });

    test('returns the file unchanged when sap.ui.require is not found', () => {
        const noRequire = BASE_FILE.replace('sap.ui.require', 'sapui.require');
        const result = spliceModulesIntoQUnitContent(noRequire, ['myApp/test/integration/NewJourney']);
        expect(result).toBe(noRequire);
    });

    test('preserves all content outside the require array exactly', () => {
        const result = spliceModulesIntoQUnitContent(BASE_FILE, ['myApp/test/integration/NewJourney']);

        // The loader config block must be untouched
        expect(result).toContain('sap.ui.loader.config({');
        expect(result).toContain('"sap/ui/qunit/sinon-qunit-bridge"');
        // The function body must be untouched
        expect(result).toContain('    "use strict";');
        expect(result).toContain('    QUnit.start();');
    });

    test('uses the same indentation as the existing entries', () => {
        const result = spliceModulesIntoQUnitContent(BASE_FILE, ['myApp/test/integration/NewJourney']);

        // Each entry line (including the new one) should start with four spaces
        const lines = result.split('\n');
        const newEntryLine = lines.find((l) => l.includes('NewJourney'));
        expect(newEntryLine).toMatch(/^ {4}"/);
    });

    test('each inserted entry ends with a trailing comma', () => {
        const result = spliceModulesIntoQUnitContent(BASE_FILE, ['myApp/test/integration/NewJourney']);

        expect(result).toContain('"myApp/test/integration/NewJourney",');
    });

    test('adds a trailing comma to last existing entry when it is missing (real-world file format)', () => {
        // Matches the actual generated file: last entry has no trailing comma, no trailing newline before `]`
        const fileWithNoTrailingComma = `sap.ui.require(
  [
    "sap/ui/thirdparty/qunit-2",
    "sap/ui/qunit/qunit-junit",
    "sap/ui/qunit/qunit-coverage",
    'myApp/test/integration/FirstJourney'
  ], function (QUnit) {
    "use strict";
    QUnit.start();
});
`;
        const result = spliceModulesIntoQUnitContent(fileWithNoTrailingComma, ['myApp/test/integration/NewJourney']);

        // Last existing entry must now have a trailing comma
        expect(result).toContain("'myApp/test/integration/FirstJourney',");
        // New entry must also have a trailing comma
        expect(result).toContain('"myApp/test/integration/NewJourney",');
        // No blank line between the two entries
        const lines = result.split('\n');
        const firstJourneyIdx = lines.findIndex((l) => l.includes('FirstJourney'));
        const newJourneyIdx = lines.findIndex((l) => l.includes('NewJourney'));
        expect(newJourneyIdx).toBe(firstJourneyIdx + 1);
    });

    test('inserts on its own line when array body has no trailing newline (template format)', () => {
        const result = spliceModulesIntoQUnitContent(TEMPLATE_FILE, ['myApp/test/integration/NewJourney']);

        const lines = result.split('\n');
        const newEntryLine = lines.find((l) => l.includes('NewJourney') && !l.includes('TravelList'));
        // Must be on its own line, properly indented, not concatenated with the previous entry
        expect(newEntryLine).toMatch(/^ {4}"myApp\/test\/integration\/NewJourney",$/);
    });
});

describe('addPathsToQUnitJs()', () => {
    const testOutDirPath = join('/', 'project', 'webapp', 'test');
    const expectedFilePath = join(testOutDirPath, 'integration', 'opaTests.qunit.js');

    function makeFsMock(content: string): jest.Mocked<Pick<Editor, 'read' | 'write'>> {
        return {
            read: jest.fn().mockReturnValue(content),
            write: jest.fn()
        };
    }

    test('reads opaTests.qunit.js from the testOutDirPath and writes updated content', () => {
        const fs = makeFsMock(BASE_FILE) as unknown as Editor;
        addPathsToQUnitJs(['myApp/test/integration/NewJourney'], testOutDirPath, fs);

        expect(fs.read).toHaveBeenCalledWith(expectedFilePath);
        expect(fs.write).toHaveBeenCalledWith(
            expectedFilePath,
            expect.stringContaining('"myApp/test/integration/NewJourney",')
        );
    });

    test('does not write when no modules need to be added', () => {
        const fs = makeFsMock(BASE_FILE) as unknown as Editor;
        addPathsToQUnitJs(['myApp/test/integration/TravelListJourney'], testOutDirPath, fs);

        expect(fs.read).toHaveBeenCalledWith(expectedFilePath);
        expect(fs.write).not.toHaveBeenCalled();
    });

    test('does not write when module list is empty', () => {
        const fs = makeFsMock(BASE_FILE) as unknown as Editor;
        addPathsToQUnitJs([], testOutDirPath, fs);

        expect(fs.write).not.toHaveBeenCalled();
    });
});

describe('readHtmlTargetFromQUnitJs()', () => {
    const basePath = join('/', 'project');
    const testPath = join(basePath, 'webapp', 'test');
    const expectedFilePath = join(testPath, 'integration_old', 'opaTests.qunit.js');

    function makeFsMock(content: string): jest.Mocked<Pick<Editor, 'read' | 'exists'>> {
        return {
            read: jest.fn().mockReturnValue(content),
            exists: jest.fn().mockReturnValue(true)
        };
    }

    test('extracts a simple html filename', () => {
        const content = `sap.ui.require.toUrl('my/app') + '/index.html'`;
        const fs = makeFsMock(content) as unknown as Editor;

        expect(readHtmlTargetFromQUnitJs(testPath, fs)).toBe('index.html');
        expect(fs.read).toHaveBeenCalledWith(expectedFilePath);
    });

    test('extracts path with query parameters and hash fragment', () => {
        const content = `launchUrl: sap.ui.require.toUrl('fin/ap/financingorder/manage') + '/test/flpSandbox.html?sap-ui-xx-viewCache=false#finapfinancingordermanage-tile'`;
        const fs = makeFsMock(content) as unknown as Editor;

        expect(readHtmlTargetFromQUnitJs(testPath, fs)).toBe(
            'test/flpSandbox.html?sap-ui-xx-viewCache=false#finapfinancingordermanage-tile'
        );
    });

    test('extracts path with whitespace around the + operator', () => {
        const content = `sap.ui.require.toUrl( 'my/app' )  +  '/test/sandbox.html#app-tile'`;
        const fs = makeFsMock(content) as unknown as Editor;

        expect(readHtmlTargetFromQUnitJs(testPath, fs)).toBe('test/sandbox.html#app-tile');
    });

    test('returns undefined when launchUrl pattern is not found', () => {
        const fs = makeFsMock(BASE_FILE) as unknown as Editor;

        expect(readHtmlTargetFromQUnitJs(testPath, fs)).toBeUndefined();
    });

    test('reads hash from HTML file when launch URL has no hash fragment', () => {
        const qunitContent = `sap.ui.require.toUrl('my/app') + '/test/flpSandbox.html'`;
        const htmlContent = `applications: { "myapp-tile": { title: "My App" } }`;
        const fs = {
            exists: jest.fn().mockReturnValue(true),
            read: jest
                .fn()
                .mockReturnValueOnce(qunitContent) // qunit file
                .mockReturnValueOnce(htmlContent) // flpSandbox.html
        } as unknown as Editor;

        expect(readHtmlTargetFromQUnitJs(testPath, fs)).toBe('test/flpSandbox.html#myapp-tile');
    });

    test('reads hash from HTML file when launch URL has query params but no hash', () => {
        const qunitContent = `sap.ui.require.toUrl('my/app') + '/test/flpSandbox.html?sap-ui-xx-viewCache=false'`;
        const htmlContent = `applications: { "myapp-tile": { title: "My App" } }`;
        const fs = {
            exists: jest.fn().mockReturnValue(true),
            read: jest.fn().mockReturnValueOnce(qunitContent).mockReturnValueOnce(htmlContent)
        } as unknown as Editor;

        expect(readHtmlTargetFromQUnitJs(testPath, fs)).toBe(
            'test/flpSandbox.html?sap-ui-xx-viewCache=false#myapp-tile'
        );
    });

    test('falls back to Opa.qunit.js when opaTests.qunit.js does not exist', () => {
        const content = `sap.ui.require.toUrl('my/app') + '/test/sandbox.html#app-tile'`;
        const opaTestsPath = join(testPath, 'integration_old', 'opaTests.qunit.js');
        const opaPath = join(testPath, 'integration_old', 'Opa.qunit.js');
        const fs = {
            exists: jest.fn().mockImplementation((path: string) => path !== opaTestsPath),
            read: jest.fn().mockReturnValue(content)
        } as unknown as Editor;

        expect(readHtmlTargetFromQUnitJs(testPath, fs)).toBe('test/sandbox.html#app-tile');
        expect(fs.read).toHaveBeenCalledWith(opaPath);
    });

    test('returns undefined when fs.read throws', () => {
        const fs = {
            exists: jest.fn().mockReturnValue(true),
            read: jest.fn().mockImplementation(() => {
                throw new Error('Permission denied');
            })
        } as unknown as Editor;

        expect(readHtmlTargetFromQUnitJs(testPath, fs)).toBeUndefined();
    });
});

describe('addIntegrationOldToGitignore()', () => {
    const projectBasePath = join('/', 'project');
    const gitignorePath = join(projectBasePath, '.gitignore');
    const ENTRY = '/webapp/test/integration_old';

    function makeFsMock(content: string | null): jest.Mocked<Pick<Editor, 'exists' | 'read' | 'write'>> {
        return {
            exists: jest.fn().mockReturnValue(content !== null),
            read: jest.fn().mockReturnValue(content ?? ''),
            write: jest.fn()
        };
    }

    test('creates .gitignore with the entry when the file does not exist', async () => {
        const fs = makeFsMock(null) as unknown as Editor;
        await addIntegrationOldToGitignore(projectBasePath, fs);

        expect(fs.write).toHaveBeenCalledWith(gitignorePath, `${ENTRY}\n`);
    });

    test('appends the entry to an existing file that ends with a newline', async () => {
        const fs = makeFsMock('node_modules/\ndist/\n') as unknown as Editor;
        await addIntegrationOldToGitignore(projectBasePath, fs);

        expect(fs.write).toHaveBeenCalledWith(gitignorePath, `node_modules/\ndist/\n${ENTRY}\n`);
    });

    test('appends the entry with a leading newline when existing file has no trailing newline', async () => {
        const fs = makeFsMock('node_modules/\ndist/') as unknown as Editor;
        await addIntegrationOldToGitignore(projectBasePath, fs);

        expect(fs.write).toHaveBeenCalledWith(gitignorePath, `node_modules/\ndist/\n${ENTRY}\n`);
    });

    test('does not write when the entry is already present', async () => {
        const fs = makeFsMock(`node_modules/\n${ENTRY}\ndist/\n`) as unknown as Editor;
        await addIntegrationOldToGitignore(projectBasePath, fs);

        expect(fs.write).not.toHaveBeenCalled();
    });

    test('does not write when the entry is already present without trailing newline', async () => {
        const fs = makeFsMock(`node_modules/\n${ENTRY}`) as unknown as Editor;
        await addIntegrationOldToGitignore(projectBasePath, fs);

        expect(fs.write).not.toHaveBeenCalled();
    });
});

/** Realistic JourneyRunner.js with tab indentation (matching the LropVirtualTests template) */
const JOURNEY_RUNNER_FILE = `sap.ui.define([
    "sap/fe/test/JourneyRunner",
\t"myApp/test/integration/pages/TravelList",
\t"myApp/test/integration/pages/TravelObjectPage"
], function (JourneyRunner, TravelList, TravelObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('myApp') + '/test/flp.html#app-preview',
        pages: {
\t\t\tonTheTravelList: TravelList,
\t\t\tonTheTravelObjectPage: TravelObjectPage
        },
        async: true
    });

    return runner;
});
`;

describe('splicePageIntoJourneyRunner()', () => {
    test('returns file unchanged when all pages already exist', () => {
        const result = splicePageIntoJourneyRunner(JOURNEY_RUNNER_FILE, [
            { targetKey: 'TravelList', appPath: 'myApp' },
            { targetKey: 'TravelObjectPage', appPath: 'myApp' }
        ]);

        expect(result).toBe(JOURNEY_RUNNER_FILE);
    });

    test('returns file unchanged when pages array is empty', () => {
        const result = splicePageIntoJourneyRunner(JOURNEY_RUNNER_FILE, []);
        expect(result).toBe(JOURNEY_RUNNER_FILE);
    });

    test('adds a new page to all three locations', () => {
        const result = splicePageIntoJourneyRunner(JOURNEY_RUNNER_FILE, [{ targetKey: 'NewPage', appPath: 'myApp' }]);

        // 1. define array
        expect(result).toContain('"myApp/test/integration/pages/NewPage",');
        // 2. function params
        expect(result).toContain(', NewPage');
        // 3. pages object
        expect(result).toContain('onTheNewPage: NewPage,');
    });

    test('adds a trailing comma to the last existing define entry when missing', () => {
        // JOURNEY_RUNNER_FILE has TravelObjectPage without a trailing comma in the define array
        const result = splicePageIntoJourneyRunner(JOURNEY_RUNNER_FILE, [{ targetKey: 'NewPage', appPath: 'myApp' }]);

        expect(result).toContain('"myApp/test/integration/pages/TravelObjectPage",');
    });

    test('adds a trailing comma to the last existing pages entry when missing', () => {
        // JOURNEY_RUNNER_FILE has onTheTravelObjectPage without a trailing comma
        const result = splicePageIntoJourneyRunner(JOURNEY_RUNNER_FILE, [{ targetKey: 'NewPage', appPath: 'myApp' }]);

        expect(result).toContain('onTheTravelObjectPage: TravelObjectPage,');
    });

    test('skips pages already present when adding new ones', () => {
        const result = splicePageIntoJourneyRunner(JOURNEY_RUNNER_FILE, [
            { targetKey: 'TravelList', appPath: 'myApp' }, // already present
            { targetKey: 'NewPage', appPath: 'myApp' } // new
        ]);

        // New page must appear
        expect(result).toContain('"myApp/test/integration/pages/NewPage",');
        // Existing page must not be duplicated
        const count = (result.match(/"myApp\/test\/integration\/pages\/TravelList"/g) ?? []).length;
        expect(count).toBe(1);
    });

    test('adds multiple new pages to all three locations', () => {
        const result = splicePageIntoJourneyRunner(JOURNEY_RUNNER_FILE, [
            { targetKey: 'PageA', appPath: 'myApp' },
            { targetKey: 'PageB', appPath: 'myApp' }
        ]);

        expect(result).toContain('"myApp/test/integration/pages/PageA",');
        expect(result).toContain('"myApp/test/integration/pages/PageB",');
        expect(result).toContain('onThePageA: PageA,');
        expect(result).toContain('onThePageB: PageB,');
        expect(result).toContain(', PageA');
        expect(result).toContain(', PageB');
    });

    test('preserves all content outside the patched locations', () => {
        const result = splicePageIntoJourneyRunner(JOURNEY_RUNNER_FILE, [{ targetKey: 'NewPage', appPath: 'myApp' }]);

        expect(result).toContain("launchUrl: sap.ui.require.toUrl('myApp') + '/test/flp.html#app-preview'");
        expect(result).toContain("'use strict';");
        expect(result).toContain('async: true');
        expect(result).toContain('return runner;');
    });

    test('new define entries use same indentation as existing entries', () => {
        const result = splicePageIntoJourneyRunner(JOURNEY_RUNNER_FILE, [{ targetKey: 'NewPage', appPath: 'myApp' }]);

        const lines = result.split('\n');
        const newDefineLine = lines.find((l) => l.includes('pages/NewPage'));
        // The first entry in the define array uses 4-space indentation ("sap/fe/test/JourneyRunner")
        // so new entries inherit the same 4-space indent
        expect(newDefineLine).toMatch(/^ {4}"/);
    });

    test('new page object entries use same indentation as existing entries', () => {
        const result = splicePageIntoJourneyRunner(JOURNEY_RUNNER_FILE, [{ targetKey: 'NewPage', appPath: 'myApp' }]);

        const lines = result.split('\n');
        const newPageLine = lines.find((l) => l.includes('onTheNewPage'));
        expect(newPageLine).toMatch(/^\t\t\t/);
    });
});

describe('addPagesToJourneyRunner()', () => {
    const testOutDirPath = join('/', 'project', 'webapp', 'test');
    const expectedFilePath = join(testOutDirPath, 'integration', 'pages', 'JourneyRunner.js');

    function makeFsMock(content: string): jest.Mocked<Pick<Editor, 'read' | 'write'>> {
        return {
            read: jest.fn().mockReturnValue(content),
            write: jest.fn()
        };
    }

    test('reads JourneyRunner.js from the testOutDirPath and writes updated content', () => {
        const fs = makeFsMock(JOURNEY_RUNNER_FILE) as unknown as Editor;
        addPagesToJourneyRunner([{ targetKey: 'NewPage', appPath: 'myApp' }], testOutDirPath, fs);

        expect(fs.read).toHaveBeenCalledWith(expectedFilePath);
        expect(fs.write).toHaveBeenCalledWith(
            expectedFilePath,
            expect.stringContaining('"myApp/test/integration/pages/NewPage",')
        );
    });

    test('does not write when all pages are already present', () => {
        const fs = makeFsMock(JOURNEY_RUNNER_FILE) as unknown as Editor;
        addPagesToJourneyRunner(
            [
                { targetKey: 'TravelList', appPath: 'myApp' },
                { targetKey: 'TravelObjectPage', appPath: 'myApp' }
            ],
            testOutDirPath,
            fs
        );

        expect(fs.read).toHaveBeenCalledWith(expectedFilePath);
        expect(fs.write).not.toHaveBeenCalled();
    });

    test('does not throw when JourneyRunner.js does not exist', () => {
        const fs = {
            read: jest.fn().mockImplementation(() => {
                throw new Error('File not found');
            }),
            write: jest.fn()
        } as unknown as Editor;

        expect(() => {
            addPagesToJourneyRunner([{ targetKey: 'NewPage', appPath: 'myApp' }], testOutDirPath, fs);
        }).not.toThrow();
        expect(fs.write).not.toHaveBeenCalled();
    });
});

describe('MAX_FILE_CONTENT_LENGTH guard', () => {
    test('spliceModulesIntoQUnitContent returns content unchanged when it exceeds the limit', () => {
        const oversized = BASE_FILE + ' '.repeat(10_001);
        const result = spliceModulesIntoQUnitContent(oversized, ['myApp/test/integration/NewJourney']);
        expect(result).toBe(oversized);
    });

    test('splicePageIntoJourneyRunner returns content unchanged when it exceeds the limit', () => {
        const oversized = JOURNEY_RUNNER_FILE + ' '.repeat(10_001);
        const result = splicePageIntoJourneyRunner(oversized, [{ targetKey: 'NewPage', appPath: 'myApp' }]);
        expect(result).toBe(oversized);
    });

    test('addPathsToQUnitJs does not write when file content exceeds the limit', () => {
        const oversized = BASE_FILE + ' '.repeat(10_001);
        const fs = {
            read: jest.fn().mockReturnValue(oversized),
            write: jest.fn()
        } as unknown as Editor;
        addPathsToQUnitJs(['myApp/test/integration/NewJourney'], join('/', 'project', 'webapp', 'test'), fs);
        expect(fs.write).not.toHaveBeenCalled();
    });
});

describe('hasVirtualOPA5()', () => {
    const mockGetAllUi5YamlFileNames = getAllUi5YamlFileNames as jest.MockedFunction<typeof getAllUi5YamlFileNames>;
    const mockReadUi5Yaml = readUi5Yaml as jest.MockedFunction<typeof readUi5Yaml>;
    const basePath = join('/', 'project');

    beforeEach(() => {
        jest.resetAllMocks();
    });

    test('returns true when a yaml file has a fiori-tools-preview middleware with OPA5 framework', async () => {
        mockGetAllUi5YamlFileNames.mockResolvedValue(['ui5.yaml']);
        mockReadUi5Yaml.mockResolvedValue({
            findCustomMiddleware: jest.fn().mockReturnValue({
                configuration: { test: [{ framework: 'OPA5', path: '/test/opaTests.qunit.html' }] }
            })
        } as any);

        expect(await hasVirtualOPA5(basePath)).toBe(true);
    });

    test('returns false when no yaml file has OPA5 configured', async () => {
        mockGetAllUi5YamlFileNames.mockResolvedValue(['ui5.yaml']);
        mockReadUi5Yaml.mockResolvedValue({
            findCustomMiddleware: jest.fn().mockReturnValue({
                configuration: { test: [{ framework: 'KARMA', path: '/test/karma.html' }] }
            })
        } as any);

        expect(await hasVirtualOPA5(basePath)).toBe(false);
    });

    test('returns false when fiori-tools-preview middleware has no test array', async () => {
        mockGetAllUi5YamlFileNames.mockResolvedValue(['ui5.yaml']);
        mockReadUi5Yaml.mockResolvedValue({
            findCustomMiddleware: jest.fn().mockReturnValue({ configuration: {} })
        } as any);

        expect(await hasVirtualOPA5(basePath)).toBe(false);
    });

    test('returns false when fiori-tools-preview middleware is not present', async () => {
        mockGetAllUi5YamlFileNames.mockResolvedValue(['ui5.yaml']);
        mockReadUi5Yaml.mockResolvedValue({
            findCustomMiddleware: jest.fn().mockReturnValue(undefined)
        } as any);

        expect(await hasVirtualOPA5(basePath)).toBe(false);
    });

    test('returns false when no yaml files are found', async () => {
        mockGetAllUi5YamlFileNames.mockResolvedValue([]);

        expect(await hasVirtualOPA5(basePath)).toBe(false);
    });

    test('skips yaml files that throw and continues checking remaining files', async () => {
        mockGetAllUi5YamlFileNames.mockResolvedValue(['ui5-bad.yaml', 'ui5.yaml']);
        mockReadUi5Yaml.mockRejectedValueOnce(new Error('Cannot parse')).mockResolvedValueOnce({
            findCustomMiddleware: jest.fn().mockReturnValue({
                configuration: { test: [{ framework: 'OPA5' }] }
            })
        } as any);

        expect(await hasVirtualOPA5(basePath)).toBe(true);
    });

    test('returns true when OPA5 is in a test array alongside other frameworks', async () => {
        mockGetAllUi5YamlFileNames.mockResolvedValue(['ui5.yaml']);
        mockReadUi5Yaml.mockResolvedValue({
            findCustomMiddleware: jest.fn().mockReturnValue({
                configuration: {
                    test: [{ framework: 'KARMA' }, { framework: 'OPA5' }, { framework: 'QUnit' }]
                }
            })
        } as any);

        expect(await hasVirtualOPA5(basePath)).toBe(true);
    });

    test('returns true on the first yaml that has OPA5 without reading further files', async () => {
        mockGetAllUi5YamlFileNames.mockResolvedValue(['ui5.yaml', 'ui5-mock.yaml']);
        mockReadUi5Yaml.mockResolvedValue({
            findCustomMiddleware: jest.fn().mockReturnValue({
                configuration: { test: [{ framework: 'OPA5' }] }
            })
        } as any);

        expect(await hasVirtualOPA5(basePath)).toBe(true);
        expect(mockReadUi5Yaml).toHaveBeenCalledTimes(1);
    });
});
