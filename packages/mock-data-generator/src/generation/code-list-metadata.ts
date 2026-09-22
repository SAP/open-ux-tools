import type { SchemaEntity, SchemaGraph, SchemaProperty } from '../schema/graph.js';
import { capCodeList, type CapCodeListKind } from '../semantics/cap-code-lists.js';
import { UNIT_ISO_CODES, UNIT_SAMPLES } from '../semantics/sample-catalog.js';
import type { JsonValue, MockDataRow } from '../types.js';
import { VALUE_TIER } from '../types.js';
import { currencyFractionDigits } from './coherence.js';
import { propertyValueIsValid } from './constraints.js';
import { assignmentIsProtected } from './currency-metadata.js';
import { retagValueTier, type ValueTierTally } from './deterministic.js';
import { fitDisplayText } from './value-list-context.js';

// ISO 4217 numeric codes for the currencies the value banks generate.
const ISO_4217_NUMERIC: Readonly<Record<string, string>> = {
    AUD: '036',
    BRL: '986',
    CAD: '124',
    CHF: '756',
    CNY: '156',
    CZK: '203',
    DKK: '208',
    EUR: '978',
    GBP: '826',
    HKD: '344',
    INR: '356',
    JPY: '392',
    MXN: '484',
    NOK: '578',
    NZD: '554',
    PLN: '985',
    SEK: '752',
    SGD: '702',
    USD: '840',
    ZAR: '710'
};

// Display decimals for the units the value banks generate: counted units have none, measured ones three.
const UNIT_DECIMALS: Readonly<Record<string, number>> = {
    EA: 0,
    PC: 0,
    KG: 3,
    L: 3,
    M: 3,
    H: 2,
    S: 0,
    MIN: 0,
    D: 0,
    WK: 0
};
const UNIT_TEXTS: ReadonlyMap<string, string> = new Map(UNIT_SAMPLES.map(({ code, text }) => [code, text]));

function safely<T>(compute: () => T): T | undefined {
    try {
        return compute();
    } catch {
        return undefined;
    }
}

function displayName(locale: string, type: 'currency' | 'region' | 'language', code: string): string | undefined {
    return safely(() => new Intl.DisplayNames(locale, { type, fallback: 'none' }).of(code));
}

function currencySymbol(locale: string, code: string): string | undefined {
    return safely(
        () =>
            new Intl.NumberFormat(locale, { style: 'currency', currency: code, currencyDisplay: 'narrowSymbol' })
                .formatToParts(0)
                .find((part) => part.type === 'currency')?.value
    );
}

function timezoneName(locale: string, code: string): string | undefined {
    return safely(
        () =>
            new Intl.DateTimeFormat(locale, { timeZone: code, timeZoneName: 'long' })
                .formatToParts(new Date(Date.UTC(2026, 0, 15)))
                .find((part) => part.type === 'timeZoneName')?.value
    );
}

function localeOf(value: JsonValue | undefined, fallback: string): string {
    if (typeof value !== 'string' || value.length === 0) {
        return fallback;
    }
    const normalized = value.replace(/_/gu, '-');
    return safely(() => Intl.getCanonicalLocales(normalized)[0]) ?? fallback;
}

function nameFor(kind: CapCodeListKind, locale: string, code: string): string | undefined {
    switch (kind) {
        case 'currency':
            return displayName(locale, 'currency', code);
        case 'country':
            return displayName(locale, 'region', code);
        case 'language':
            return displayName(locale, 'language', code);
        case 'timezone':
            return timezoneName(locale, code) ?? code;
        case 'unit':
            return UNIT_TEXTS.get(code);
        default:
            return undefined;
    }
}

function own<T>(table: Readonly<Record<string, T>>, code: string): T | undefined {
    return Object.hasOwn(table, code) ? table[code] : undefined;
}

function decimalsFor(kind: CapCodeListKind, code: string): number | undefined {
    if (kind === 'currency') {
        return currencyFractionDigits(code);
    }
    return kind === 'unit' ? own(UNIT_DECIMALS, code) : undefined;
}

function asColumn(field: SchemaProperty, value: number | string | undefined): JsonValue | undefined {
    if (value === undefined) {
        return undefined;
    }
    return field.primitiveType === 'string' ? String(value) : Number(value);
}

function valueFor(kind: CapCodeListKind, field: SchemaProperty, locale: string, code: string): JsonValue | undefined {
    switch (field.name.toLowerCase()) {
        case 'name':
        case 'descr':
        case 'text':
            // A short text column holds the leading characters of the name, as the backend's does.
            return fitDisplayText(field, nameFor(kind, locale, code));
        case 'symbol':
            return kind === 'currency' ? currencySymbol(locale, code) : undefined;
        case 'minor':
        case 'minorunit':
        case 'decimalplaces':
            return asColumn(field, decimalsFor(kind, code));
        case 'numcode':
            return asColumn(field, kind === 'currency' ? own(ISO_4217_NUMERIC, code) : undefined);
        case 'isocode':
            // A currency's code is already its ISO 4217 code; a unit's internal code maps to ISO/UN-ECE.
            if (kind === 'unit') {
                return own(UNIT_ISO_CODES, code);
            }
            return kind === 'currency' ? code : undefined;
        case 'externalcode':
            return kind === 'unit' || kind === 'currency' ? code : undefined;
        default:
            return undefined;
    }
}

function codeListFields(graph: SchemaGraph, entity: SchemaEntity): ReadonlyArray<SchemaProperty> {
    return entity.properties.filter(
        (property) =>
            [
                'name',
                'descr',
                'text',
                'symbol',
                'minor',
                'minorunit',
                'decimalplaces',
                'numcode',
                'isocode',
                'externalcode'
            ].includes(property.name.toLowerCase()) && !assignmentIsProtected(graph, entity, property)
    );
}

/**
 * Fill the columns of the standard code lists (CAP's `sap.common.Currencies`, `Countries`,
 * `Languages`, `Timezones` and their `_texts` entities, and SAP Gateway's `SAP__Currencies` and
 * `SAP__UnitsOfMeasure`) from each row's own code, so a row reads coherently — EUR, Euro, €, 2 or
 * KG, KGM, Kilogram, 3 — and localized text rows are written in their row's locale. Keys, enumerations,
 * relationship fields and value-list parameters are never rewritten, and a value that does not fit
 * its column's facets is left as generated. Filled columns are counted as recognised values.
 *
 * @param graph schema graph
 * @param resources generated rows by entity set
 * @param valueTiers value-tier tally to retag, when tiers are being tracked
 * @param locale locale for names outside a `_texts` entity
 * @returns rows with code-list columns filled
 */
export function applyCapCodeListMetadata(
    graph: SchemaGraph,
    resources: Readonly<Record<string, ReadonlyArray<MockDataRow>>>,
    valueTiers?: ValueTierTally,
    locale = 'en'
): Readonly<Record<string, ReadonlyArray<MockDataRow>>> {
    const generated = { ...resources };
    for (const entity of graph.entities) {
        const codeList = capCodeList(entity);
        const rows = resources[entity.entitySetName];
        if (!codeList || !rows) {
            continue;
        }
        const fields = codeListFields(graph, entity);
        const filled = new Set<string>();
        generated[entity.entitySetName] = rows.map((row) => {
            const code = row[codeList.codeProperty];
            if (typeof code !== 'string' || code.length === 0) {
                return row;
            }
            const rowLocale = codeList.texts ? localeOf(row.locale, locale) : locale;
            const updated = { ...row };
            for (const field of fields) {
                const value = valueFor(codeList.kind, field, rowLocale, code);
                if (value !== undefined && propertyValueIsValid(field, value)) {
                    updated[field.name] = value;
                    filled.add(field.name);
                }
            }
            return Object.freeze(updated);
        });
        if (valueTiers) {
            for (const name of filled) {
                retagValueTier(valueTiers, entity.entitySetName, name, VALUE_TIER.recognised);
            }
        }
    }
    return Object.freeze(generated);
}
