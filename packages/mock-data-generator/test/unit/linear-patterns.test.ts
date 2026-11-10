import { ACRONYM_BOUNDARY, identifierWords } from '../../src/naming.js';
import { trimTrailingSeparators } from '../../src/model/causal-text-runtime.js';
import { lastDigitRun } from '../../src/generation/sft.js';
import { propertyValueIsValid } from '../../src/generation/constraints.js';
import type { SchemaProperty } from '../../src/schema/graph.js';

// Each linear rewrite is checked against the backtracking regular expression it replaced, kept here verbatim as the
// oracle; their slowness and complexity are the point, hence NOSONAR.
const ORACLE_ACRONYM = /([A-Z]+)([A-Z][a-z])/gu; // NOSONAR
const ORACLE_TRAILING = /[\s,;:&+/(\-–—]+$/u; // NOSONAR
const ORACLE_LAST_DIGIT_RUN = /(\d+)(?!.*\d)/u; // NOSONAR
const ORACLE_DATE_TIME =
    /^(\d{4}-\d{2}-\d{2})T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?(Z|[+-](?:(?:0\d|1[0-3]):[0-5]\d|14:00))?$/; // NOSONAR

/**
 * Deterministic pseudo-random strings over an alphabet, so every run checks the same inputs.
 *
 * @param alphabet characters to draw from
 * @param count number of strings
 * @param maxLength longest string
 * @returns the strings
 */
function samples(alphabet: string, count: number, maxLength: number): string[] {
    let state = 0x2545f491;
    const next = (): number => {
        state ^= state << 13;
        state ^= state >>> 17;
        state ^= state << 5;
        return (state >>> 0) / 0x1_0000_0000;
    };
    const characters = [...alphabet];
    return Array.from({ length: count }, () =>
        Array.from(
            { length: Math.floor(next() * (maxLength + 1)) },
            () => characters[Math.floor(next() * characters.length)]
        ).join('')
    );
}

describe('linear rewrites of backtracking patterns', () => {
    it('splits acronyms exactly like the original capture-group pattern', () => {
        // Given identifiers with runs of capitals, lowercase, digits and separators
        const inputs = [
            '',
            'HTTPServer',
            'ABCDeFGHi',
            'AAbCc',
            'ABCdEFg',
            'DeliveryItemID',
            'ID',
            'XMLHttpRequest',
            `${'A'.repeat(5000)}b`,
            ...samples('ABCab1_ \n', 4000, 16)
        ];
        for (const input of inputs) {
            // When both split the acronyms
            // Then they agree
            expect(input.replace(ACRONYM_BOUNDARY, ' ')).toBe(input.replace(ORACLE_ACRONYM, '$1 $2'));
        }
        expect(identifierWords('HTTPServerURLPath')).toEqual(['HTTP', 'Server', 'URL', 'Path']);
    });

    it('trims trailing separators exactly like the original anchored class', () => {
        // Given texts ending in mixes of whitespace, separators and text
        const inputs = [
            '',
            'Sales order, ',
            'A – B —',
            ' ,;:&+/(-',
            'keep',
            `x${' ,'.repeat(5000)}y`,
            ...samples('a ,;:&+/(-–—\t\n  )', 4000, 12)
        ];
        for (const input of inputs) {
            expect(trimTrailingSeparators(input)).toBe(input.replace(ORACLE_TRAILING, ''));
        }
    });

    it('finds the same last digit run as the original lookahead pattern', () => {
        // Given values with digit runs, including several lines
        const inputs = [
            '',
            'AC02',
            'B012x',
            '12a3',
            'a1b2\nc3',
            'a1\r\nb2',
            'x 9',
            'no digits',
            `${'1'.repeat(3000)}x2`,
            ...samples('a1\n2b\r9', 4000, 14)
        ];
        for (const input of inputs) {
            const match = ORACLE_LAST_DIGIT_RUN.exec(input);
            const expected = match ? { start: match.index, end: match.index + match[1].length } : undefined;
            expect(lastDigitRun(input)).toEqual(expected);
        }
    });

    it('accepts the same date-times as the original single pattern', () => {
        // Given date-time strings around every range boundary
        const property: SchemaProperty = {
            name: 'At',
            primitiveType: 'datetimeoffset',
            nullable: false,
            isKey: false,
            annotations: []
        };
        const inputs = [
            '2024-02-29T23:59:59Z',
            '2023-02-29T10:00:00Z',
            '2024-01-01T24:00:00Z',
            '2024-01-01T00:60:00Z',
            '2024-01-01T00:00:60Z',
            '2024-01-01T00:00:00.123+14:00',
            '2024-01-01T00:00:00+14:01',
            '2024-01-01T00:00:00-13:59',
            '2024-01-01T00:00:00+13:60',
            '2024-01-01T00:00:00+1400',
            '2024-01-01T00:00:00.Z',
            '2024-01-01T00:00:00',
            '2024-01-01 00:00:00Z',
            ...samples('0123456789-T:Z+.', 3000, 26).map((tail) => `2024-01-0${tail}`)
        ];
        for (const input of inputs) {
            const match = ORACLE_DATE_TIME.exec(input);
            const expected =
                match?.[2] !== undefined &&
                !Number.isNaN(Date.parse(input)) &&
                (() => {
                    const [year, month, day] = match[1].split('-').map(Number);
                    const parsed = new Date(Date.UTC(year, month - 1, day));
                    return parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
                })();
            expect(propertyValueIsValid(property, input)).toBe(expected);
        }
    });
});
