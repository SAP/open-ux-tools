import { advanceText, createJsonRowGrammar, grammarComplete, textAllowed } from '../../src/model/json-row-grammar.js';

describe('JSON row grammar literal validation', () => {
    test('rejects invalid number continuations and accepts a complete JSON number', () => {
        const initial = createJsonRowGrammar([{ name: 'Amount', valueKind: 'number', nullable: false }]);
        const decimal = advanceText(initial, '{"Amount":12.5');

        expect(textAllowed(decimal, '.')).toBe(false);
        expect(textAllowed(decimal, '}')).toBe(true);
        expect(grammarComplete(advanceText(decimal, '}'))).toBe(true);
    });

    test('does not allow an incomplete exponent to close', () => {
        const initial = createJsonRowGrammar([{ name: 'Amount', valueKind: 'number', nullable: false }]);
        const exponent = advanceText(initial, '{"Amount":12e');

        expect(textAllowed(exponent, '}')).toBe(false);
        expect(textAllowed(exponent, '3}')).toBe(true);
    });

    test('accepts only complete boolean and nullable null literals', () => {
        const boolInitial = createJsonRowGrammar([{ name: 'Blocked', valueKind: 'boolean', nullable: false }]);
        const partialBoolean = advanceText(boolInitial, '{"Blocked":tru');
        expect(textAllowed(partialBoolean, 'x')).toBe(false);
        expect(textAllowed(partialBoolean, 'e}')).toBe(true);

        const nullableInitial = createJsonRowGrammar([{ name: 'Limit', valueKind: 'number', nullable: true }]);
        const nullValue = advanceText(nullableInitial, '{"Limit":null');
        expect(textAllowed(nullValue, '}')).toBe(true);
    });
});
