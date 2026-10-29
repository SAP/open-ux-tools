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
        const initial = createJsonRowGrammar([{ name: 'Amount', valueKind: 'number', nullable: false }], {
            separators: 'compact'
        });
        const decimal = advanceText(initial, '{"Amount":12.5');

        expect(textAllowed(decimal, '.')).toBe(false);
        expect(textAllowed(decimal, '}')).toBe(true);
        expect(grammarComplete(advanceText(decimal, '}'))).toBe(true);
    });

    test('does not allow an incomplete exponent to close', () => {
        const initial = createJsonRowGrammar([{ name: 'Amount', valueKind: 'number', nullable: false }], {
            separators: 'compact'
        });
        const exponent = advanceText(initial, '{"Amount":12e');

        expect(textAllowed(exponent, '}')).toBe(false);
        expect(textAllowed(exponent, '3}')).toBe(true);
    });

    test('accepts only complete boolean and nullable null literals', () => {
        const boolInitial = createJsonRowGrammar([{ name: 'Blocked', valueKind: 'boolean', nullable: false }], {
            separators: 'compact'
        });
        const partialBoolean = advanceText(boolInitial, '{"Blocked":tru');
        expect(textAllowed(partialBoolean, 'x')).toBe(false);
        expect(textAllowed(partialBoolean, 'e}')).toBe(true);

        const nullableInitial = createJsonRowGrammar([{ name: 'Limit', valueKind: 'number', nullable: true }], {
            separators: 'compact'
        });
        const nullValue = advanceText(nullableInitial, '{"Limit":null');
        expect(textAllowed(nullValue, '}')).toBe(true);
    });

    test('rejects invalid JSON string escapes', () => {
        const initial = createJsonRowGrammar([{ name: 'Name', valueKind: 'string', nullable: false }], {
            separators: 'compact'
        });
        const escaped = advanceText(initial, '{"Name":"North\\');

        expect(textAllowed(escaped, 'q')).toBe(false);
        // A \u escape is never offered: the string writes its characters directly.
        expect(textAllowed(escaped, 'u00FC')).toBe(false);
        expect(textAllowed(escaped, 'nGate"}')).toBe(true);
    });

    test('forces a string to close at its metadata maximum length', () => {
        const initial = createJsonRowGrammar([{ name: 'Code', valueKind: 'string', nullable: false, maxLength: 2 }], {
            separators: 'compact'
        });
        const completeValue = advanceText(initial, '{"Code":"AB');

        expect(textAllowed(completeValue, 'C')).toBe(false);
        expect(textAllowed(completeValue, '\\n')).toBe(false);
        expect(textAllowed(completeValue, '"}')).toBe(true);
        expect(grammarComplete(advanceText(completeValue, '"}'))).toBe(true);
    });

    test('requires a Unicode letter or number before closing a generated string', () => {
        const initial = createJsonRowGrammar([{ name: 'Name', valueKind: 'string', nullable: false }], {
            separators: 'compact'
        });
        const punctuationOnly = advanceText(initial, '{"Name":"[{');

        expect(textAllowed(punctuationOnly, '"}')).toBe(false);
        expect(textAllowed(punctuationOnly, 'é"}')).toBe(true);
    });

    test('reserves bounded string capacity for a letter or number', () => {
        const initial = createJsonRowGrammar([{ name: 'Code', valueKind: 'string', nullable: false, maxLength: 1 }], {
            separators: 'compact'
        });
        const emptyValue = advanceText(initial, '{"Code":"');

        expect(textAllowed(emptyValue, '[')).toBe(false);
        expect(textAllowed(emptyValue, '7"}')).toBe(true);
    });
});

describe('JSON row grammar, type-exact numbers and canonical separators', () => {
    const integer = { integer: true, maxIntegerDigits: 3, maxFractionDigits: 0, minimum: 0, maximum: 255 };
    const decimal = { integer: false, maxIntegerDigits: 3, maxFractionDigits: 2 };

    test('takes integer digits only, within the type range and without leading zeros', () => {
        const initial = createJsonRowGrammar(
            [{ name: 'Count', valueKind: 'number', nullable: false, numberFormat: integer }],
            { separators: 'compact' }
        );
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
        const initial = createJsonRowGrammar(
            [{ name: 'Amount', valueKind: 'number', nullable: false, numberFormat: decimal }],
            { separators: 'compact' }
        );
        const value = advanceText(initial, '{"Amount":');

        expect(textAllowed(value, '-123.45}')).toBe(true);
        expect(textAllowed(value, '1234')).toBe(false);
        expect(textAllowed(value, '1.234')).toBe(false);
        expect(textAllowed(value, '12.}')).toBe(false);

        const wholeOnly = advanceText(
            createJsonRowGrammar(
                [
                    {
                        name: 'Factor',
                        valueKind: 'number',
                        nullable: false,
                        numberFormat: { integer: false, maxIntegerDigits: 3, maxFractionDigits: 0 }
                    }
                ],
                { separators: 'compact' }
            ),
            '{"Factor":89'
        );
        expect(textAllowed(wholeOnly, '.')).toBe(false);
        expect(textAllowed(wholeOnly, '}')).toBe(true);
    });

    test('keeps a fraction-only decimal below one', () => {
        const initial = createJsonRowGrammar(
            [
                {
                    name: 'Rate',
                    valueKind: 'number',
                    nullable: false,
                    numberFormat: { integer: false, maxIntegerDigits: 1, maxFractionDigits: 3, maximum: 0.999 }
                }
            ],
            { separators: 'compact' }
        );
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

describe('JSON row grammar dead ends', () => {
    test('does not open an escape that could only end a string without a letter or digit', () => {
        const state = advanceText(
            createJsonRowGrammar([{ name: 'Origin', valueKind: 'string', nullable: true, maxLength: 3 }], {
                separators: 'spaced'
            }),
            '{"Origin": "--'
        );
        expect(textAllowed(state, '\\')).toBe(false);
        expect(textAllowed(state, 'A')).toBe(true);
        expect(textAllowed(advanceText(state, 'A'), '"}')).toBe(true);
    });
});
