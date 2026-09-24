import {
    advanceText,
    createJsonRowGrammar,
    forcedText,
    grammarComplete,
    textAllowed,
    valueStateKey,
    withinSteeringWindow
} from '../../src/model/json-row-grammar.js';

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

    test('requires a Unicode letter or number before closing a generated string', () => {
        const initial = createJsonRowGrammar([{ name: 'Name', valueKind: 'string', nullable: false }]);
        const punctuationOnly = advanceText(initial, '{"Name":"[{');

        expect(textAllowed(punctuationOnly, '"}')).toBe(false);
        expect(textAllowed(punctuationOnly, 'é"}')).toBe(true);
    });

    test('recognizes alphanumeric content represented by a JSON Unicode escape', () => {
        const initial = createJsonRowGrammar([{ name: 'Name', valueKind: 'string', nullable: false }]);
        const escapedPunctuation = advanceText(initial, '{"Name":"\\u005B');
        const escapedLetter = advanceText(initial, '{"Name":"\\u00FC');

        expect(textAllowed(escapedPunctuation, '"}')).toBe(false);
        expect(textAllowed(escapedLetter, '"}')).toBe(true);
    });

    test('reserves bounded string capacity for a letter or number', () => {
        const initial = createJsonRowGrammar([{ name: 'Code', valueKind: 'string', nullable: false, maxLength: 1 }]);
        const emptyValue = advanceText(initial, '{"Code":"');

        expect(textAllowed(emptyValue, '[')).toBe(false);
        expect(textAllowed(emptyValue, '7"}')).toBe(true);
    });
});

describe('JSON row grammar, runtime contract 2', () => {
    const integer = { integer: true, maxIntegerDigits: 3, maxFractionDigits: 0, minimum: 0, maximum: 255 };
    const decimal = { integer: false, maxIntegerDigits: 3, maxFractionDigits: 2 };

    test('takes integer digits only, within the type range and without leading zeros', () => {
        const initial = createJsonRowGrammar([
            { name: 'Count', valueKind: 'number', nullable: false, numberFormat: integer }
        ]);
        const value = advanceText(initial, '{"Count":');

        expect(textAllowed(value, '25}')).toBe(true);
        expect(textAllowed(value, '255}')).toBe(true);
        expect(textAllowed(value, '256')).toBe(false);
        expect(textAllowed(value, '2.5')).toBe(false);
        expect(textAllowed(value, '1e3')).toBe(false);
        expect(textAllowed(value, '-1')).toBe(false);
        expect(textAllowed(value, '07')).toBe(false);
        expect(textAllowed(value, '0}')).toBe(true);
    });

    test('bounds decimal digits by precision and scale and never ends on a bare point', () => {
        const initial = createJsonRowGrammar([
            { name: 'Amount', valueKind: 'number', nullable: false, numberFormat: decimal }
        ]);
        const value = advanceText(initial, '{"Amount":');

        expect(textAllowed(value, '-123.45}')).toBe(true);
        expect(textAllowed(value, '1234')).toBe(false);
        expect(textAllowed(value, '1.234')).toBe(false);
        expect(textAllowed(value, '12.}')).toBe(false);

        const wholeOnly = advanceText(
            createJsonRowGrammar([
                {
                    name: 'Factor',
                    valueKind: 'number',
                    nullable: false,
                    numberFormat: { integer: false, maxIntegerDigits: 3, maxFractionDigits: 0 }
                }
            ]),
            '{"Factor":89'
        );
        expect(textAllowed(wholeOnly, '.')).toBe(false);
        expect(textAllowed(wholeOnly, '}')).toBe(true);
    });

    test('keeps a fraction-only decimal below one', () => {
        const initial = createJsonRowGrammar([
            {
                name: 'Rate',
                valueKind: 'number',
                nullable: false,
                numberFormat: { integer: false, maxIntegerDigits: 1, maxFractionDigits: 3, maximum: 0.999 }
            }
        ]);
        const value = advanceText(initial, '{"Rate":');

        expect(textAllowed(value, '0.125}')).toBe(true);
        expect(textAllowed(value, '1')).toBe(false);
    });

    test('enforces the separators of the training rows and forces the punctuation around values', () => {
        const fields = [
            { name: 'Name', valueKind: 'string' as const, nullable: false },
            { name: 'Note', valueKind: 'string' as const, nullable: true }
        ];
        const spaced = createJsonRowGrammar(fields, { separators: 'spaced' });

        expect(forcedText(spaced)).toBe('{"Name": "');
        expect(textAllowed(spaced, '{ "Name"')).toBe(false);
        const afterName = advanceText(spaced, '{"Name": "Acme"');
        // The note is nullable, so the model chooses between a string and null after the forced key.
        expect(forcedText(afterName)).toBe(', "Note": ');
        expect(textAllowed(advanceText(afterName, ', "Note": '), 'null}')).toBe(true);
        expect(grammarComplete(advanceText(afterName, ', "Note": null}'))).toBe(true);

        const compact = createJsonRowGrammar(fields, { separators: 'compact' });
        expect(forcedText(compact)).toBe('{"Name":"');
        expect(textAllowed(advanceText(compact, '{"Name":"Acme"'), ', ')).toBe(false);
    });

    test('keeps value tokens from reaching into the next key', () => {
        const state = advanceText(
            createJsonRowGrammar(
                [
                    { name: 'Name', valueKind: 'string', nullable: false },
                    { name: 'City', valueKind: 'string', nullable: false }
                ],
                { separators: 'spaced' }
            ),
            '{"Name": "Acme'
        );

        expect(textAllowed(state, '", ', { withinValue: true })).toBe(true);
        expect(textAllowed(state, '", "Ci', { withinValue: true })).toBe(false);
        expect(textAllowed(state, '", "Ci')).toBe(true);
    });

    test('keys equivalent value states alike across different field names', () => {
        const first = advanceText(
            createJsonRowGrammar(
                [
                    { name: 'Name', valueKind: 'string', nullable: false, maxLength: 80 },
                    { name: 'City', valueKind: 'string', nullable: false }
                ],
                { separators: 'spaced' }
            ),
            '{"Name": "Acme'
        );
        const second = advanceText(
            createJsonRowGrammar(
                [
                    { name: 'Title', valueKind: 'string', nullable: false, maxLength: 80 },
                    { name: 'Owner', valueKind: 'string', nullable: false }
                ],
                { separators: 'spaced' }
            ),
            '{"Title": "Northgate'
        );
        const last = advanceText(
            createJsonRowGrammar([{ name: 'Title', valueKind: 'string', nullable: false, maxLength: 80 }], {
                separators: 'spaced'
            }),
            '{"Title": "Northgate'
        );

        expect(valueStateKey(first, 16)).toBe(valueStateKey(second, 16));
        // Whether another field follows changes which delimiters a value token may carry.
        expect(valueStateKey(first, 16)).not.toBe(valueStateKey(last, 16));
    });

    test('marks the steering window near a string maximum and rejects structure-like strings', () => {
        const initial = createJsonRowGrammar(
            [{ name: 'Text', valueKind: 'string', nullable: false, maxLength: 12, steerWithin: 3 }],
            { separators: 'spaced' }
        );
        const opened = advanceText(initial, '{"Text": "');

        expect(textAllowed(opened, '[')).toBe(false);
        expect(textAllowed(opened, '{')).toBe(false);
        expect(withinSteeringWindow(advanceText(opened, 'Short'))).toBe(false);
        expect(withinSteeringWindow(advanceText(opened, 'Longer text'))).toBe(true);
        expect(textAllowed(advanceText(opened, 'Caf\\'), 'u00E9')).toBe(false);
    });
});
