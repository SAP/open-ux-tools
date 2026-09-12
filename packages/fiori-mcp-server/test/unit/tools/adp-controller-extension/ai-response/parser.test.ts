import {
    extractFilesFromResponse,
    isChangeFile
} from '../../../../../src/tools/adp-controller-extension/ai-response/parser.js';

describe('ai-response/parser', () => {
    describe('extractFilesFromResponse', () => {
        test('extracts a single file with a path marker and code fence', () => {
            const content = [
                '**Path:** webapp/changes/coding/MyExt.js',
                '```javascript',
                'sap.ui.define([], function () {});',
                '```'
            ].join('\n');

            const result = extractFilesFromResponse(content);

            expect(result).toEqual([
                { path: 'webapp/changes/coding/MyExt.js', code: 'sap.ui.define([], function () {});' }
            ]);
        });

        test('extracts multiple files separated by paragraphs', () => {
            const content = [
                '**Path:** webapp/changes/coding/A.js',
                '```javascript',
                'console.log("a");',
                '```',
                '',
                'Some explanation.',
                '',
                '**Path:** webapp/changes/fragment/B.fragment.xml',
                '```xml',
                '<core:FragmentDefinition/>',
                '```'
            ].join('\n');

            const result = extractFilesFromResponse(content);

            expect(result).toHaveLength(2);
            expect(result[0].path).toBe('webapp/changes/coding/A.js');
            expect(result[1].path).toBe('webapp/changes/fragment/B.fragment.xml');
        });

        test('drops a code block without a preceding path marker', () => {
            const content = ['```javascript', 'orphan();', '```'].join('\n');

            expect(extractFilesFromResponse(content)).toEqual([]);
        });

        test('drops empty code blocks', () => {
            const content = ['**Path:** webapp/empty.js', '```javascript', '   ', '```'].join('\n');

            expect(extractFilesFromResponse(content)).toEqual([]);
        });

        test('handles fences without language hints', () => {
            const content = ['**Path:** webapp/changes/coding/X.js', '```', 'code();', '```'].join('\n');

            expect(extractFilesFromResponse(content)).toEqual([
                { path: 'webapp/changes/coding/X.js', code: 'code();' }
            ]);
        });

        test('returns an empty array for prose-only input', () => {
            expect(extractFilesFromResponse('Just some explanation, no code.')).toEqual([]);
        });
    });

    describe('isChangeFile', () => {
        test.each([
            ['id_addCustomItem.change', true],
            ['nested/path/foo.change', true],
            ['CASE.CHANGE', true],
            ['MyExt.js', false],
            ['fragment.xml', false],
            ['', false]
        ])('isChangeFile(%s) === %s', (input, expected) => {
            expect(isChangeFile(input)).toBe(expected);
        });
    });
});
