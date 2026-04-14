import {
    addPathsToQUnitJs,
    spliceModulesIntoQUnitContent,
    readHtmlTargetFromQUnitJs,
    addIntegrationOldToGitignore
} from '../../../src/utils/opaQUnitUtils';
import { join } from 'node:path';
import type { Editor } from 'mem-fs-editor';

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
