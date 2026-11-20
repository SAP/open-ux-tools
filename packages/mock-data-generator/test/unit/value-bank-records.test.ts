import type { SchemaProperty } from '../../src/schema/graph.js';
import { packagedBanks } from '../../src/semantics/bank-store.js';
import { semanticRowContext, semanticValue } from '../../src/semantics/value-banks.js';

// The IBAN and numeric-range providers of value-banks.ts as they were before their tables moved to the
// value-bank store (commit 22235d92be), kept verbatim as the oracle of the equivalence tests below.
function fixedDigits(hash: number, length: number): string {
    const modulus = 10n ** BigInt(length);
    return (BigInt(hash) % modulus).toString().padStart(length, '0');
}

function oracleIban(country: 'DE' | 'IE' | 'IT' | 'CZ', hash: number): string {
    let bban = `37040044${fixedDigits(hash, 10)}`;
    if (country === 'IE') {
        bban = `BOFI900017${fixedDigits(hash, 8)}`;
    } else if (country === 'IT') {
        bban = `X0542811101${fixedDigits(hash, 12)}`;
    } else if (country === 'CZ') {
        bban = `0800${fixedDigits(hash, 16)}`;
    }
    const digits = `${bban}${country}00`.replace(/[A-Z]/gu, (letter) => String(letter.charCodeAt(0) - 55));
    return `${country}${String(98n - (BigInt(digits) % 97n)).padStart(2, '0')}${bban}`;
}

function numericFacetBounds(property: SchemaProperty): Readonly<{ minimum: number; maximum: number; scale: number }> {
    if (property.primitiveType === 'int') {
        return {
            minimum: property.numericMinimum ?? Number.MIN_SAFE_INTEGER,
            maximum: property.numericMaximum ?? Number.MAX_SAFE_INTEGER,
            scale: 0
        };
    }
    const scale = Math.min(property.scale ?? (property.precision === undefined ? 2 : 0), 6);
    const precision = Math.min(property.precision ?? 15, 15);
    const maximum =
        property.precision === undefined
            ? Number.MAX_SAFE_INTEGER
            : (10 ** precision - 1) / 10 ** Math.min(property.scale ?? 0, precision);
    return { minimum: -maximum, maximum, scale };
}

function boundedNumericValue(
    property: SchemaProperty,
    hash: number,
    desiredMinimum: number,
    desiredMaximum: number
): number | undefined {
    if (property.primitiveType !== 'int' && property.primitiveType !== 'decimal') {
        return undefined;
    }
    const facets = numericFacetBounds(property);
    const factor = 10 ** facets.scale;
    const minimum = Math.ceil(Math.max(desiredMinimum, facets.minimum) * factor);
    const maximum = Math.floor(Math.min(desiredMaximum, facets.maximum) * factor);
    if (minimum > maximum) {
        return undefined;
    }
    return Number(((minimum + (hash % (maximum - minimum + 1))) / factor).toFixed(facets.scale));
}

const ORACLE_RANGES: ReadonlyArray<readonly [string, number, number]> = [
    ['exponent', -6, 6],
    ['count', 1, 500],
    ['conversion_factor', 1, 100],
    ['conversion_offset', -10, 10],
    ['monetary_amount', 100, 9_099.99],
    ['price', 5, 500],
    ['duration', 1, 15],
    ['quantity', 1, 90.99],
    ['distance', 1, 5000],
    ['rating', 1, 5],
    ['percentage', 0, 100],
    ['interest_rate', 0, 20],
    ['temperature', -30, 50],
    ['pressure', 0.5, 20]
];

/**
 * A property of a primitive type with optional facets.
 *
 * @param primitiveType the primitive type
 * @param facets precision, scale and numeric bounds
 * @returns the property
 */
function property(
    primitiveType: SchemaProperty['primitiveType'],
    facets: Partial<Pick<SchemaProperty, 'precision' | 'scale' | 'numericMinimum' | 'numericMaximum'>> = {}
): SchemaProperty {
    return { name: 'Value', primitiveType, nullable: false, isKey: false, annotations: [], ...facets };
}

const HASHES = Array.from({ length: 400 }, (_, index) => (index * 2_654_435_761) % 4_294_967_296);

describe('value-bank records', () => {
    it.each(['DE', 'IE', 'IT', 'CZ'] as const)('generates the same %s IBANs as the former tables', (country) => {
        // Given row contexts for the country and many row hashes
        const value = property('string');
        // When IBANs are generated
        const generated = HASHES.map((hash) =>
            semanticValue('iban', value, semanticRowContext(hash, undefined, country), hash)
        );
        // Then each equals the former provider's IBAN
        expect(generated).toEqual(HASHES.map((hash) => oracleIban(country, hash)));
    });

    it('generates no IBAN without a configured country', () => {
        expect(semanticValue('iban', property('string'), semanticRowContext(1), 1)).toBeUndefined();
    });

    it('covers exactly the former numeric roles', () => {
        expect([...packagedBanks().numericRoleRanges.keys()].sort()).toEqual(
            ORACLE_RANGES.map(([role]) => role).sort()
        );
    });

    it.each(ORACLE_RANGES)('draws %s values from the former range under every facet', (role, minimum, maximum) => {
        // Given numeric and non-numeric properties with assorted facets
        const properties = [
            property('int'),
            property('int', { numericMinimum: 0, numericMaximum: 3 }),
            property('int', { numericMinimum: 600, numericMaximum: 700 }),
            property('decimal'),
            property('decimal', { precision: 3, scale: 0 }),
            property('decimal', { precision: 5, scale: 2 }),
            property('decimal', { precision: 13, scale: 3 }),
            property('decimal', { precision: 2, scale: 1 }),
            property('decimal', { scale: 6 }),
            property('bool')
        ];
        const context = semanticRowContext(7);
        for (const candidate of properties) {
            // When values are generated
            const generated = HASHES.map((hash) => semanticValue(role, candidate, context, hash));
            // Then each equals the former provider's value
            expect(generated).toEqual(HASHES.map((hash) => boundedNumericValue(candidate, hash, minimum, maximum)));
        }
    });
});
