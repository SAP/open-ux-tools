import { join } from 'node:path';
import type { Editor } from 'mem-fs-editor';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';

import { addJourneysToAllJourneysFile } from '../../../src/fiori-elements-opa-writer.js';
import type { WriteContext } from '../../../src/types.js';

const TEST_OUT_DIR = join('/', 'my', 'app', 'webapp', 'test');
const ALL_JOURNEYS_PATH = join(TEST_OUT_DIR, 'integration', 'AllJourneys.gen.json');

/**
 * Builds a minimal `WriteContext` carrying only the fields `addJourneysToAllJourneysFile`
 * reads (`testOutDirPath` and `editor`); the rest is irrelevant to this function.
 *
 * @param editor - the mem-fs editor the function should read from and write to
 * @returns a WriteContext sufficient for exercising addJourneysToAllJourneysFile
 */
function makeContext(editor: Editor): WriteContext {
    // Only testOutDirPath and editor are consumed by the function under test.
    return { testOutDirPath: TEST_OUT_DIR, editor } as unknown as WriteContext;
}

describe('addJourneysToAllJourneysFile()', () => {
    let editor: Editor;

    beforeEach(() => {
        editor = create(createStorage());
    });

    test('does nothing when there are no generated journeys', () => {
        editor.writeJSON(ALL_JOURNEYS_PATH, ['ExistingJourney.gen']);

        addJourneysToAllJourneysFile([], makeContext(editor));

        expect(editor.readJSON(ALL_JOURNEYS_PATH)).toEqual(['ExistingJourney.gen']);
    });

    test('does nothing (and does not create the file) when the file does not exist', () => {
        addJourneysToAllJourneysFile(['ListReport'], makeContext(editor));

        expect(editor.exists(ALL_JOURNEYS_PATH)).toBe(false);
    });

    test('appends new journeys with the Journey.gen suffix to the existing entries', () => {
        editor.writeJSON(ALL_JOURNEYS_PATH, ['ExistingJourney.gen']);

        addJourneysToAllJourneysFile(['ListReport', 'ObjectPage'], makeContext(editor));

        expect(editor.readJSON(ALL_JOURNEYS_PATH)).toEqual([
            'ExistingJourney.gen',
            'ListReportJourney.gen',
            'ObjectPageJourney.gen'
        ]);
    });

    test('does not add duplicate entries that already exist', () => {
        editor.writeJSON(ALL_JOURNEYS_PATH, ['ListReportJourney.gen']);

        addJourneysToAllJourneysFile(['ListReport', 'ObjectPage'], makeContext(editor));

        expect(editor.readJSON(ALL_JOURNEYS_PATH)).toEqual(['ListReportJourney.gen', 'ObjectPageJourney.gen']);
    });

    test('treats an empty JSON array file as having no existing entries', () => {
        editor.writeJSON(ALL_JOURNEYS_PATH, []);

        addJourneysToAllJourneysFile(['ListReport'], makeContext(editor));

        expect(editor.readJSON(ALL_JOURNEYS_PATH)).toEqual(['ListReportJourney.gen']);
    });

    test('treats a null JSON file content as having no existing entries', () => {
        editor.writeJSON(ALL_JOURNEYS_PATH, null);

        addJourneysToAllJourneysFile(['ListReport'], makeContext(editor));

        expect(editor.readJSON(ALL_JOURNEYS_PATH)).toEqual(['ListReportJourney.gen']);
    });

    test('ignores an unexpected object shape and writes only the generated journeys', () => {
        editor.writeJSON(ALL_JOURNEYS_PATH, { unexpected: 'content' });

        addJourneysToAllJourneysFile(['ListReport'], makeContext(editor));

        expect(editor.readJSON(ALL_JOURNEYS_PATH)).toEqual(['ListReportJourney.gen']);
    });

    test('ignores an array containing non-string entries and writes only the generated journeys', () => {
        editor.writeJSON(ALL_JOURNEYS_PATH, ['ExistingJourney.gen', 42, { bad: true }]);

        addJourneysToAllJourneysFile(['ListReport'], makeContext(editor));

        expect(editor.readJSON(ALL_JOURNEYS_PATH)).toEqual(['ListReportJourney.gen']);
    });
});
