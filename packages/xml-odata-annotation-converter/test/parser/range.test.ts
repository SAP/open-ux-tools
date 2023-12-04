import { transformElementRange } from '../../src/parser/range';
import { SourcePosition, XMLElement } from '@xml-tools/ast';

describe('edge cases', () => {
    test('guessedAttributeRange handling', () => {
        const result = transformElementRange(
            { startLine: 1, startColumn: 1, endLine: 2, endColumn: 10 } as unknown as SourcePosition,
            { syntax: { guessedAttributesRange: {} as unknown as SourcePosition } } as unknown as XMLElement
        );
        expect(result).toMatchInlineSnapshot(`
            Object {
              "end": Object {
                "character": 11,
                "line": 1,
              },
              "start": Object {
                "character": 0,
                "line": 0,
              },
            }
        `);
    });
});
