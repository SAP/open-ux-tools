import { jest } from '@jest/globals';
import { join } from 'node:path';
import type { Editor } from 'mem-fs-editor';
import type { Logger } from '@sap-ux/logger';

import {
    addPagesToJourneyRunner,
    splicePageIntoJourneyRunner,
    type JourneyRunnerPage
} from '../../../src/utils/journeyRunnerUtils.js';
import { MAX_FILE_CONTENT_LENGTH } from '../../../src/utils/fileWritingUtils.js';
import { initI18n } from '../../../src/i18n.js';

await initI18n();

/**
 * Builds a `JourneyRunnerPage` with the same shape that the writer produces:
 * `fileName` carries the `.gen` suffix and `fileExtension` is the file's extension.
 *
 * @param targetKey - the page's target key (matches the manifest target id)
 * @returns a fully populated JourneyRunnerPage
 */
function makePage(targetKey: string): JourneyRunnerPage {
    return {
        targetKey,
        appPath: 'myApp',
        fileName: `${targetKey}.gen`,
        fileExtension: 'js'
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
});

describe('MAX_FILE_CONTENT_LENGTH guard', () => {
    test('splicePageIntoJourneyRunner returns content unchanged when it exceeds the limit', () => {
        const oversized = JOURNEY_RUNNER_FILE + ' '.repeat(MAX_FILE_CONTENT_LENGTH + 1);
        const result = splicePageIntoJourneyRunner(oversized, [makePage('NewPage')]);
        expect(result).toBe(oversized);
    });
});
