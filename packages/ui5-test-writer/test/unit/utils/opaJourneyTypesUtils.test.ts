import { jest } from '@jest/globals';
import { join } from 'node:path';
import type { Editor } from 'mem-fs-editor';
import type { Logger } from '@sap-ux/logger';

import {
    addJourneysToOpaJourneyTypes,
    spliceJourneysIntoOpaJourneyTypes
} from '../../../src/utils/opaJourneyTypesUtils.js';
import type { OpaPageWriteInfo } from '../../../src/utils/journeyRunnerUtils.js';
import { MAX_FILE_CONTENT_LENGTH } from '../../../src/utils/fileWritingUtils.js';
import { initI18n } from '../../../src/i18n.js';

await initI18n();

/**
 * Builds a `OpaPageWriteInfo` with the rework-shape: `.gen` filename, plus the
 * metadata fields the TS / type-defs splicer relies on.
 *
 * @param targetKey - the page's target key
 * @param template - the framework template
 * @returns a fully populated OpaPageWriteInfo
 */
function makePage(targetKey: string, template: 'ListReport' | 'ObjectPage' = 'ListReport'): OpaPageWriteInfo {
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
 * Realistic post-rework OpaJourneyTypes.d.ts content with one ListReport page (`TravelList`)
 * already wired in. Used as the splice target across the tests.
 */
const BASE_FILE = `import type Opa5 from "sap/ui/test/Opa5";
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

describe('spliceJourneysIntoOpaJourneyTypes()', () => {
    test('returns the original content when all pages are already present', () => {
        const result = spliceJourneysIntoOpaJourneyTypes(BASE_FILE, [makePage('TravelList')]);
        expect(result).toBe(BASE_FILE);
    });

    test('returns the original content when no pages are passed', () => {
        const result = spliceJourneysIntoOpaJourneyTypes(BASE_FILE, []);
        expect(result).toBe(BASE_FILE);
    });

    test('skips pages with an unsupported framework', () => {
        const result = spliceJourneysIntoOpaJourneyTypes(BASE_FILE, [{ ...makePage('FpmPage'), template: 'FPM' }]);
        // Custom-import for unsupported framework is not added; When/Then stay untouched
        expect(result).not.toContain('FpmPage');
    });

    test('adds a new ObjectPage entry: framework import, custom import, When and Then unions', () => {
        const result = spliceJourneysIntoOpaJourneyTypes(BASE_FILE, [makePage('TravelObjectPage', 'ObjectPage')]);

        // Framework import added (ObjectPage was missing from BASE_FILE)
        expect(result).toContain('from "sap/fe/test/ObjectPage"');
        // Custom import added (`.gen` path, Generated suffix)
        expect(result).toContain(
            'import type { actions as TravelObjectPageGeneratedCustomActions, assertions as TravelObjectPageGeneratedCustomAssertions } from "../pages/TravelObjectPage.gen";'
        );
        // When-union member added
        expect(result).toContain(
            'onTheTravelObjectPageGenerated: Opa5 & ObjectPageActions & TemplatePageActions & typeof TravelObjectPageGeneratedCustomActions;'
        );
        // Then-union member added
        expect(result).toContain(
            'onTheTravelObjectPageGenerated: Opa5 & ObjectPageAssertions & TemplatePageAssertions & typeof TravelObjectPageGeneratedCustomAssertions;'
        );
        // Existing TravelList content is preserved
        expect(result).toContain('onTheTravelListGenerated: Opa5 & ListReportActions');
    });

    test('does not duplicate a framework import that is already present', () => {
        // BASE_FILE already imports ListReportActions/Assertions; adding another LR page
        // must not re-add the framework import line.
        const result = spliceJourneysIntoOpaJourneyTypes(BASE_FILE, [makePage('AnotherList', 'ListReport')]);

        const occurrences = result.match(/from "sap\/fe\/test\/ListReport"/g) ?? [];
        expect(occurrences).toHaveLength(1);
        // The new page is still spliced in
        expect(result).toContain('onTheAnotherListGenerated:');
    });

    test('returns content unchanged when it exceeds MAX_FILE_CONTENT_LENGTH', () => {
        const oversized = BASE_FILE + ' '.repeat(MAX_FILE_CONTENT_LENGTH + 1);
        const result = spliceJourneysIntoOpaJourneyTypes(oversized, [makePage('TravelObjectPage', 'ObjectPage')]);
        expect(result).toBe(oversized);
    });

    test('does not splice into When/Then unions when they cannot be located', () => {
        // No `import` line to anchor against, and no `When`/`Then` unions to splice into.
        // The splicer must leave the content untouched.
        const malformed = `// no imports here\nexport const x = 1;\n`;
        const result = spliceJourneysIntoOpaJourneyTypes(malformed, [makePage('TravelList')]);
        expect(result).toBe(malformed);
    });
});

describe('addJourneysToOpaJourneyTypes()', () => {
    const testOutDirPath = join('/', 'project', 'webapp', 'test');
    const expectedFilePath = join(testOutDirPath, 'integration', 'types', 'OpaJourneyTypes.d.ts');

    function makeFsMock(content: string): Pick<Editor, 'read' | 'write'> {
        return {
            read: jest.fn<(filepath: string) => string>().mockReturnValue(content) as unknown as Editor['read'],
            write: jest.fn<Editor['write']>()
        };
    }

    test('reads OpaJourneyTypes.d.ts from the testOutDirPath and writes spliced content', () => {
        const fs = makeFsMock(BASE_FILE) as unknown as Editor;
        addJourneysToOpaJourneyTypes([makePage('TravelObjectPage', 'ObjectPage')], testOutDirPath, fs);

        expect(fs.read).toHaveBeenCalledWith(expectedFilePath);
        expect(fs.write).toHaveBeenCalledWith(
            expectedFilePath,
            expect.stringContaining('onTheTravelObjectPageGenerated:')
        );
    });

    test('does not write when all pages are already present', () => {
        const fs = makeFsMock(BASE_FILE) as unknown as Editor;
        addJourneysToOpaJourneyTypes([makePage('TravelList')], testOutDirPath, fs);

        expect(fs.read).toHaveBeenCalledWith(expectedFilePath);
        expect(fs.write).not.toHaveBeenCalled();
    });

    test('does not write and does not throw when the file is empty', () => {
        const fs = makeFsMock('') as unknown as Editor;
        expect(() => addJourneysToOpaJourneyTypes([makePage('TravelList')], testOutDirPath, fs)).not.toThrow();
        expect(fs.write).not.toHaveBeenCalled();
    });

    test('does nothing when no pages are passed', () => {
        const fs = makeFsMock(BASE_FILE) as unknown as Editor;
        addJourneysToOpaJourneyTypes([], testOutDirPath, fs);
        expect(fs.read).not.toHaveBeenCalled();
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

        addJourneysToOpaJourneyTypes([makePage('TravelObjectPage', 'ObjectPage')], testOutDirPath, fs, log);

        expect(log.warn).toHaveBeenCalledWith(expect.stringContaining('OpaJourneyTypes.d.ts'));
    });
});
