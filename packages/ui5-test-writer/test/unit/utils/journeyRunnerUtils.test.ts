import { jest } from '@jest/globals';
import { join } from 'node:path';
import type { Editor } from 'mem-fs-editor';
import type { Logger } from '@sap-ux/logger';

import {
    addPagesToJourneyRunner,
    splicePageIntoJourneyRunner,
    splicePageIntoJourneyRunnerTs,
    type OpaPageWriteInfo
} from '../../../src/utils/journeyRunnerUtils.js';
import { MAX_FILE_CONTENT_LENGTH } from '../../../src/utils/fileWritingUtils.js';
import { DotFileExtension } from '../../../src/types.js';
import { initI18n } from '../../../src/i18n.js';

await initI18n();

/**
 * Builds a `OpaPageWriteInfo` with the same shape that the writer produces:
 * `fileName` carries the `.gen` suffix and `dotFileExtension` is the file's extension with leading dot.
 *
 * @param targetKey - the page's target key (matches the manifest target id)
 * @returns a fully populated OpaPageWriteInfo
 */
function makePage(targetKey: string): OpaPageWriteInfo {
    return {
        targetKey,
        appPath: 'myApp',
        fileName: `${targetKey}.gen`,
        dotFileExtension: '.js'
    };
}

/**
 * Realistic JourneyRunner.js produced by the post-rework template — note the
 * `Generated` parameter suffix and the `.gen` module paths.
 */
const JOURNEY_RUNNER_FILE = `sap.ui.define([
    "sap/fe/test/JourneyRunner",
\t"myApp/test/integration/pages/TravelList.gen",
\t"myApp/test/integration/pages/TravelObjectPage.gen"
], function (JourneyRunner, TravelListGenerated, TravelObjectPageGenerated) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('myApp') + '/test/flp.html#app-preview',
        pages: {
\t\t\tonTheTravelListGenerated: TravelListGenerated,
\t\t\tonTheTravelObjectPageGenerated: TravelObjectPageGenerated
        },
        async: true
    });

    return runner;
});
`;

/**
 * Builds a TS-shaped `OpaPageWriteInfo` with all the metadata fields the TS splicer needs.
 *
 * @param targetKey - the page's target key
 * @param template - the framework template
 * @returns a fully populated OpaPageWriteInfo
 */
function makeTsPage(targetKey: string, template: 'ListReport' | 'ObjectPage'): OpaPageWriteInfo {
    return {
        targetKey,
        appPath: 'myApp',
        fileName: `${targetKey}.gen`,
        dotFileExtension: '.ts',
        template,
        appID: 'my.app',
        componentID: targetKey,
        entitySet: '',
        contextPath: '/Travel'
    };
}

/**
 * Realistic post-rework JourneyRunner.ts produced by the template — `Generated` suffixes,
 * `.gen` import paths, and the inlined `new <Framework>({...}, Custom<Page>Generated)` entries.
 */
const JOURNEY_RUNNER_TS_FILE = `import JourneyRunner from "sap/fe/test/JourneyRunner";
import ListReport from "sap/fe/test/ListReport";
import CustomTravelListGenerated from "./TravelList.gen";

const runner = new JourneyRunner({
    launchUrl: sap.ui.require.toUrl("myApp") + "/test/flp.html#app-preview",
    pages: {
        onTheTravelListGenerated: new ListReport(
            {
                appId: "my.app",
                componentId: "TravelList",
                entitySet: "",
                contextPath: "/Travel"
            },
            CustomTravelListGenerated
        )
    },
    async: true
});

export default runner;
`;

describe('splicePageIntoJourneyRunner()', () => {
    test('returns file unchanged when all pages already exist', () => {
        const result = splicePageIntoJourneyRunner(JOURNEY_RUNNER_FILE, [
            makePage('TravelList'),
            makePage('TravelObjectPage')
        ]);

        expect(result).toBe(JOURNEY_RUNNER_FILE);
    });

    test('returns file unchanged when pages array is empty', () => {
        const result = splicePageIntoJourneyRunner(JOURNEY_RUNNER_FILE, []);
        expect(result).toBe(JOURNEY_RUNNER_FILE);
    });

    test('adds a new page to all three locations using the .gen module path and Generated parameter suffix', () => {
        const result = splicePageIntoJourneyRunner(JOURNEY_RUNNER_FILE, [makePage('NewPage')]);

        expect(result).toContain('"myApp/test/integration/pages/NewPage.gen",');
        expect(result).toContain(', NewPageGenerated');
        expect(result).toContain('onTheNewPageGenerated: NewPageGenerated,');
    });

    test('adds a trailing comma to the last existing define entry when missing', () => {
        const result = splicePageIntoJourneyRunner(JOURNEY_RUNNER_FILE, [makePage('NewPage')]);

        expect(result).toContain('"myApp/test/integration/pages/TravelObjectPage.gen",');
    });

    test('adds a trailing comma to the last existing pages entry when missing', () => {
        const result = splicePageIntoJourneyRunner(JOURNEY_RUNNER_FILE, [makePage('NewPage')]);

        expect(result).toContain('onTheTravelObjectPageGenerated: TravelObjectPageGenerated,');
    });

    test('skips pages already present when adding new ones', () => {
        const result = splicePageIntoJourneyRunner(JOURNEY_RUNNER_FILE, [makePage('TravelList'), makePage('NewPage')]);

        expect(result).toContain('"myApp/test/integration/pages/NewPage.gen",');
        const count = (result.match(/"myApp\/test\/integration\/pages\/TravelList\.gen"/g) ?? []).length;
        expect(count).toBe(1);
    });

    test('adds multiple new pages to all three locations', () => {
        const result = splicePageIntoJourneyRunner(JOURNEY_RUNNER_FILE, [makePage('PageA'), makePage('PageB')]);

        expect(result).toContain('"myApp/test/integration/pages/PageA.gen",');
        expect(result).toContain('"myApp/test/integration/pages/PageB.gen",');
        expect(result).toContain('onThePageAGenerated: PageAGenerated,');
        expect(result).toContain('onThePageBGenerated: PageBGenerated,');
        expect(result).toContain(', PageAGenerated');
        expect(result).toContain(', PageBGenerated');
    });

    test('preserves all content outside the patched locations', () => {
        const result = splicePageIntoJourneyRunner(JOURNEY_RUNNER_FILE, [makePage('NewPage')]);

        expect(result).toContain("launchUrl: sap.ui.require.toUrl('myApp') + '/test/flp.html#app-preview'");
        expect(result).toContain("'use strict';");
        expect(result).toContain('async: true');
        expect(result).toContain('return runner;');
    });

    test('new define entries use same indentation as existing entries', () => {
        const result = splicePageIntoJourneyRunner(JOURNEY_RUNNER_FILE, [makePage('NewPage')]);

        const lines = result.split('\n');
        const newDefineLine = lines.find((l) => l.includes('pages/NewPage.gen'));
        expect(newDefineLine).toMatch(/^ {4}"/);
    });

    test('handles a hand-edited pages object containing nested braces', () => {
        // Simulate a user who has converted a page entry to an inline `new <Page>({...})` literal.
        const handEdited = JOURNEY_RUNNER_FILE.replace(
            'onTheTravelObjectPageGenerated: TravelObjectPageGenerated',
            'onTheTravelObjectPageGenerated: new TravelObjectPageGenerated({ appId: "my.app", componentId: "TravelObjectPage" })'
        );

        const result = splicePageIntoJourneyRunner(handEdited, [makePage('NewPage')]);

        // Splicer must not stop at the first nested `}` — the new entry should be appended after the
        // hand-edited inline literal, not inserted into the middle of it.
        expect(result).toContain('onTheNewPageGenerated: NewPageGenerated,');
        expect(result.indexOf('onTheNewPageGenerated')).toBeGreaterThan(
            result.indexOf('componentId: "TravelObjectPage"')
        );
        // Existing inline literal preserved unchanged
        expect(result).toContain(
            'onTheTravelObjectPageGenerated: new TravelObjectPageGenerated({ appId: "my.app", componentId: "TravelObjectPage" })'
        );
    });

    test('new page object entries use same indentation as existing entries', () => {
        const result = splicePageIntoJourneyRunner(JOURNEY_RUNNER_FILE, [makePage('NewPage')]);

        const lines = result.split('\n');
        const newPageLine = lines.find((l) => l.includes('onTheNewPageGenerated'));
        expect(newPageLine).toMatch(/^\t\t\t/);
    });
});

describe('addPagesToJourneyRunner()', () => {
    const testOutDirPath = join('/', 'project', 'webapp', 'test');
    const expectedFilePath = join(testOutDirPath, 'integration', 'pages', 'JourneyRunner.js');

    function makeFsMock(content: string): Pick<Editor, 'read' | 'write'> {
        return {
            read: jest.fn<(filepath: string) => string>().mockReturnValue(content) as unknown as Editor['read'],
            write: jest.fn<Editor['write']>()
        };
    }

    test('reads JourneyRunner.js from the testOutDirPath and writes updated content', () => {
        const fs = makeFsMock(JOURNEY_RUNNER_FILE) as unknown as Editor;
        addPagesToJourneyRunner([makePage('NewPage')], testOutDirPath, fs);

        expect(fs.read).toHaveBeenCalledWith(expectedFilePath);
        expect(fs.write).toHaveBeenCalledWith(
            expectedFilePath,
            expect.stringContaining('"myApp/test/integration/pages/NewPage.gen",')
        );
    });

    test('does not write when all pages are already present', () => {
        const fs = makeFsMock(JOURNEY_RUNNER_FILE) as unknown as Editor;
        addPagesToJourneyRunner([makePage('TravelList'), makePage('TravelObjectPage')], testOutDirPath, fs);

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
            addPagesToJourneyRunner([makePage('NewPage')], testOutDirPath, fs);
        }).not.toThrow();
        expect(fs.write).not.toHaveBeenCalled();
    });

    test('emits a warning via the logger when the file cannot be read', () => {
        const fs = {
            read: jest.fn().mockImplementation(() => {
                throw new Error('File not found');
            }),
            write: jest.fn()
        } as unknown as Editor;
        const log = { warn: jest.fn() } as unknown as Logger;

        addPagesToJourneyRunner([makePage('NewPage')], testOutDirPath, fs, undefined, log);

        expect(log.warn).toHaveBeenCalledWith(expect.stringContaining('JourneyRunner.js'));
    });

    test('returns true when the file was written, false otherwise', () => {
        const writingFs = makeFsMock(JOURNEY_RUNNER_FILE) as unknown as Editor;
        expect(addPagesToJourneyRunner([makePage('NewPage')], testOutDirPath, writingFs)).toBe(true);

        const noopFs = makeFsMock(JOURNEY_RUNNER_FILE) as unknown as Editor;
        expect(addPagesToJourneyRunner([makePage('TravelList')], testOutDirPath, noopFs)).toBe(false);

        const emptyFs = makeFsMock(JOURNEY_RUNNER_FILE) as unknown as Editor;
        expect(addPagesToJourneyRunner([], testOutDirPath, emptyFs)).toBe(false);
    });

    test('warns and returns false when the file exceeds MAX_FILE_CONTENT_LENGTH', () => {
        const oversized = JOURNEY_RUNNER_FILE + ' '.repeat(MAX_FILE_CONTENT_LENGTH + 1);
        const fs = makeFsMock(oversized) as unknown as Editor;
        const log = { warn: jest.fn() } as unknown as Logger;

        const written = addPagesToJourneyRunner([makePage('NewPage')], testOutDirPath, fs, undefined, log);

        expect(written).toBe(false);
        expect(fs.write).not.toHaveBeenCalled();
        expect(log.warn).toHaveBeenCalledWith(expect.stringContaining('JourneyRunner.js'));
    });
});

describe('MAX_FILE_CONTENT_LENGTH guard', () => {
    test('splicePageIntoJourneyRunner returns content unchanged when it exceeds the limit', () => {
        const oversized = JOURNEY_RUNNER_FILE + ' '.repeat(MAX_FILE_CONTENT_LENGTH + 1);
        const result = splicePageIntoJourneyRunner(oversized, [makePage('NewPage')]);
        expect(result).toBe(oversized);
    });

    test('splicePageIntoJourneyRunnerTs returns content unchanged when it exceeds the limit', () => {
        const oversized = JOURNEY_RUNNER_TS_FILE + ' '.repeat(MAX_FILE_CONTENT_LENGTH + 1);
        const result = splicePageIntoJourneyRunnerTs(oversized, [makeTsPage('NewPage', 'ListReport')]);
        expect(result).toBe(oversized);
    });
});

describe('splicePageIntoJourneyRunnerTs()', () => {
    test('returns the original content when all pages are already imported', () => {
        const result = splicePageIntoJourneyRunnerTs(JOURNEY_RUNNER_TS_FILE, [makeTsPage('TravelList', 'ListReport')]);
        expect(result).toBe(JOURNEY_RUNNER_TS_FILE);
    });

    test('returns the original content when no pages are passed', () => {
        const result = splicePageIntoJourneyRunnerTs(JOURNEY_RUNNER_TS_FILE, []);
        expect(result).toBe(JOURNEY_RUNNER_TS_FILE);
    });

    test('adds a Custom<Target>Generated import for the new page', () => {
        const result = splicePageIntoJourneyRunnerTs(JOURNEY_RUNNER_TS_FILE, [
            makeTsPage('TravelObjectPage', 'ObjectPage')
        ]);
        expect(result).toContain('import CustomTravelObjectPageGenerated from "./TravelObjectPage.gen";');
    });

    test('adds the framework import for any new framework in use', () => {
        const result = splicePageIntoJourneyRunnerTs(JOURNEY_RUNNER_TS_FILE, [
            makeTsPage('TravelObjectPage', 'ObjectPage')
        ]);
        // ObjectPage was missing from the base file; the splicer must add its framework import.
        expect(result).toContain('import ObjectPage from "sap/fe/test/ObjectPage";');
        // ListReport was already imported; the splicer must not re-add it.
        const occurrences = result.match(/import ListReport from "sap\/fe\/test\/ListReport";/g) ?? [];
        expect(occurrences).toHaveLength(1);
    });

    test('inserts the new entry into the pages object literal with Generated suffix', () => {
        const result = splicePageIntoJourneyRunnerTs(JOURNEY_RUNNER_TS_FILE, [
            makeTsPage('TravelObjectPage', 'ObjectPage')
        ]);
        expect(result).toContain('onTheTravelObjectPageGenerated: new ObjectPage(');
        expect(result).toContain('CustomTravelObjectPageGenerated');
        // Both entitySet and contextPath must be emitted unconditionally so splicer output
        // matches the fresh-write template shape (see JourneyRunner.ts template).
        expect(result).toContain('entitySet: ""');
        expect(result).toContain('contextPath: "/Travel"');
    });
});

describe('addPagesToJourneyRunner() — TS dispatch', () => {
    const testOutDirPath = join('/', 'project', 'webapp', 'test');
    const expectedTsFilePath = join(testOutDirPath, 'integration', 'pages', 'JourneyRunner.ts');

    test('reads JourneyRunner.ts and writes spliced content when dotFileExtension is .ts', () => {
        const fs = {
            read: jest.fn().mockReturnValue(JOURNEY_RUNNER_TS_FILE),
            write: jest.fn()
        } as unknown as Editor;

        addPagesToJourneyRunner(
            [makeTsPage('TravelObjectPage', 'ObjectPage')],
            testOutDirPath,
            fs,
            DotFileExtension.TS
        );

        expect(fs.read).toHaveBeenCalledWith(expectedTsFilePath);
        expect(fs.write).toHaveBeenCalledWith(
            expectedTsFilePath,
            expect.stringContaining('onTheTravelObjectPageGenerated: new ObjectPage(')
        );
    });
});
