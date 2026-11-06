import type { SchemaProperty } from '../schema/graph.js';
import { semanticRules } from '../semantics/rule-store.js';
import type { JsonValue, MockDataRow } from '../types.js';
import { subjectWords, textWords } from './field-words.js';
import { generatedRows, OutcomeCollector, REALISM_CHECK } from './realism-types.js';
import type { CheckOutcome, GeographyReferences, RealismInput } from './realism-types.js';

/**
 * The checks' vocabulary and thresholds.
 *
 * @returns the rule store's `realismChecks`
 */
const rules = (): ReturnType<typeof semanticRules>['realismChecks'] => semanticRules().realismChecks;
/** ISO 9362 business identifier code: bank, country, location and optional branch. */
const BIC = /^[A-Z]{4}([A-Z]{2})[A-Z\d]{2}(?:[A-Z\d]{3})?$/u;
/** ISO 13616 international bank account number, with or without group spaces. */
const IBAN = /^([A-Z]{2})\d{2}(?: ?[A-Z\d]){10,30}$/u;
/** International calling codes have one to three digits (ITU-T E.164). */
const CALLING_CODE_DIGITS = 3;

type RegionsOf = (value: string) => ReadonlySet<string> | undefined;

/** How a geographic column's regions are read, and whether they locate another party (a bank) than the row. */
interface RegionReader {
    regionsOf: RegionsOf;
    /** A bank identifier or account number locates its bank, which need not be in the row's country. */
    otherParty: boolean;
}

/**
 * The regions a phone number in international format belongs to, by its longest known calling code.
 *
 * @param references geography references
 * @param value phone number
 * @returns the regions, or undefined when the number is not international or the code is unknown
 */
function phoneRegions(references: GeographyReferences, value: string): ReadonlySet<string> | undefined {
    if (!value.trim().startsWith('+')) {
        return undefined;
    }
    const digits = value.replace(/\D/gu, '');
    for (let length = CALLING_CODE_DIGITS; length > 0; length--) {
        const regions = references.callingCodes.get(digits.slice(0, length));
        if (regions) {
            return regions;
        }
    }
    return undefined;
}

/**
 * How the regions of a column's values are read, when the column holds geographic values.
 *
 * @param references geography references
 * @param values the column's string values
 * @returns the reader, or undefined when the column is not geographic
 */
function regionReader(references: GeographyReferences, values: ReadonlyArray<string>): RegionReader | undefined {
    const share = (matches: (value: string) => boolean): number =>
        values.length === 0 ? 0 : values.filter(matches).length / values.length;
    const byPrefix =
        (pattern: RegExp): RegionsOf =>
        (value) => {
            const region = pattern.exec(value)?.[1];
            return region && references.regions.has(region) ? new Set([region]) : undefined;
        };
    if (share((value) => BIC.test(value)) >= rules().kindShare) {
        return { regionsOf: byPrefix(BIC), otherParty: true };
    }
    if (share((value) => IBAN.test(value)) >= rules().kindShare) {
        return { regionsOf: byPrefix(IBAN), otherParty: true };
    }
    const own = (regionsOf: RegionsOf): RegionReader => ({ regionsOf, otherParty: false });
    if (share((value) => phoneRegions(references, value) !== undefined) >= rules().kindShare) {
        return own((value) => phoneRegions(references, value));
    }
    if (share((value) => references.zoneRegions.has(value)) >= rules().kindShare) {
        return own((value) => references.zoneRegions.get(value));
    }
    if (share((value) => references.cityRegions.has(value.toLowerCase())) >= rules().cityShare) {
        return own((value) => references.cityRegions.get(value.toLowerCase()));
    }
    return undefined;
}

/**
 * Whether a property is a country key: named as a country and holding region codes.
 *
 * @param references geography references
 * @param property schema property
 * @param values the column's string values
 * @returns true for country key columns
 */
function isCountryKey(
    references: GeographyReferences,
    property: SchemaProperty,
    values: ReadonlyArray<string>
): boolean {
    const words = [...textWords(property.name), ...(property.label ? textWords(property.label) : [])];
    return (
        words.some((word) => rules().countryWords.has(word)) &&
        values.length > 0 &&
        values.filter((value) => references.regions.has(value)).length / values.length >= rules().kindShare
    );
}

interface Column {
    property: SchemaProperty;
    values: string[];
}

/**
 * The values of one geographic column whose regions do not include any country of their row.
 *
 * @param rows generated rows
 * @param column the geographic column
 * @param keys the entity's country key columns
 * @param regionsOf how the column's regions are read
 * @returns the examined cell count and the failing values
 */
function rowMismatches(
    rows: ReadonlyArray<MockDataRow>,
    column: Column,
    keys: ReadonlyArray<Column>,
    regionsOf: RegionsOf
): { checked: number; failing: JsonValue[] } {
    let checked = 0;
    const failing: JsonValue[] = [];
    for (const row of rows) {
        const value = row[column.property.name];
        const anchors = new Set(keys.map((key) => row[key.property.name]).filter((code) => typeof code === 'string'));
        const regions = typeof value === 'string' ? regionsOf(value) : undefined;
        if (!regions || anchors.size === 0) {
            continue;
        }
        checked++;
        if (![...regions].some((region) => anchors.has(region))) {
            failing.push(value);
        }
    }
    return { checked, failing };
}

/**
 * The country keys whose subject words, apart from the country words, a column or its entity shares: the
 * country of the party the column identifies (`PayeeCountry` for `PayeeBic`, or for `Bic` of a payee).
 *
 * @param entityName the entity's name
 * @param column the column of another party
 * @param keys the entity's country keys
 * @returns the keys of that party
 */
function partyKeys(entityName: string, column: Column, keys: ReadonlyArray<Column>): Column[] {
    const subject = new Set([...subjectWords(column.property), ...textWords(entityName)]);
    return keys.filter(({ property }) =>
        [...subjectWords(property)].some((word) => !rules().countryWords.has(word) && subject.has(word))
    );
}

/**
 * Geographic values agree with their row: a city, phone number or time zone belongs to at least one of the
 * countries the row's country keys hold. A bank identifier or account number locates its bank, so it is
 * compared only with country keys whose subject words it shares (`PayeeBic` with `PayeeCountry`).
 *
 * @param input check input with geography references
 * @returns findings per geographic field
 */
export function checkGeography(input: RealismInput): CheckOutcome {
    const collector = new OutcomeCollector(REALISM_CHECK.geography);
    const references = input.geography;
    if (!references) {
        return collector.outcome();
    }
    for (const entity of input.graph.entities) {
        const rows = generatedRows(input, entity.entitySetName);
        const columns: Column[] = entity.properties
            .filter(({ primitiveType }) => primitiveType === 'string')
            .map((property) => ({
                property,
                values: rows
                    .map((row) => row[property.name])
                    .filter((value): value is string => typeof value === 'string' && value !== '')
            }));
        const keys = columns.filter(({ property, values }) => isCountryKey(references, property, values));
        for (const column of keys.length > 0 ? columns.filter((candidate) => !keys.includes(candidate)) : []) {
            const reader = regionReader(references, column.values);
            const anchors = reader?.otherParty ? partyKeys(entity.name, column, keys) : keys;
            if (reader && anchors.length > 0) {
                collector.field({
                    entitySet: entity.entitySetName,
                    property: column.property.name,
                    ...rowMismatches(rows, column, anchors, reader.regionsOf),
                    related: anchors.map((key) => `${entity.entitySetName}.${key.property.name}`).join(',')
                });
            }
        }
    }
    return collector.outcome();
}
