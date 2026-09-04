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

    test('rejects invalid JSON string escapes', () => {
        const initial = createJsonRowGrammar([{ name: 'Name', valueKind: 'string', nullable: false }]);
        const escaped = advanceText(initial, '{"Name":"North\\');

        expect(textAllowed(escaped, 'q')).toBe(false);
        expect(textAllowed(escaped, 'nGate"}')).toBe(true);
    });

    test('requires exactly four hexadecimal digits after a unicode escape', () => {
        const initial = createJsonRowGrammar([{ name: 'Name', valueKind: 'string', nullable: false }]);
        const unicode = advanceText(initial, '{"Name":"M\\u');

        expect(textAllowed(unicode, '12G4')).toBe(false);
        expect(textAllowed(unicode, '12"}')).toBe(false);
        expect(textAllowed(unicode, '00FCnchen"}')).toBe(true);
        expect(grammarComplete(advanceText(unicode, '00FCnchen"}'))).toBe(true);
    });

    test('forces a string to close at its metadata maximum length', () => {
        const initial = createJsonRowGrammar([{ name: 'Code', valueKind: 'string', nullable: false, maxLength: 2 }]);
        const completeValue = advanceText(initial, '{"Code":"AB');

        expect(textAllowed(completeValue, 'C')).toBe(false);
        expect(textAllowed(completeValue, '\\n')).toBe(false);
        expect(textAllowed(completeValue, '"}')).toBe(true);
        expect(grammarComplete(advanceText(completeValue, '"}'))).toBe(true);
    });
});
