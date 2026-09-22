import type { SchemaEntity, SchemaProperty } from '../schema/graph.js';

/**
 * Standard code lists whose columns have fixed meanings, so they are decided from this metadata
 * instead of being classified, and their rows are filled from the code by `applyCapCodeListMetadata`:
 *
 * - CAP's code lists from `@sap/cds/common`: `sap.common.Currencies`, `Countries`, `Languages` and
 *   `Timezones`, and their localized `_texts` entities. Every CAP application that uses the common
 *   types exposes them, usually as `Currencies` / `Currencies_texts` or with a namespace prefix such
 *   as `common_Currencies_texts`.
 * - The code lists SAP Gateway adds to RAP services, `SAP__Currencies` and `SAP__UnitsOfMeasure`,
 *   which UI5 reads through `Common.CodeList` to format amounts and quantities.
 */
export type CapCodeListKind = 'currency' | 'country' | 'language' | 'timezone' | 'unit';

export interface CapCodeList {
    kind: CapCodeListKind;
    /** The localized text entity, keyed by `locale` and `code`. */
    texts: boolean;
    /** The key column that holds the code. */
    codeProperty: string;
}

/** How one column of a standard code list is decided. */
export type CapCodeListField = { role: string } | { companion: true };

const CAP_CODE_LIST = /^(?:[A-Za-z0-9]+_)*(Currencies|Countries|Languages|Timezones)(_texts)?$/u;
const KINDS: Readonly<Record<string, CapCodeListKind>> = {
    Currencies: 'currency',
    Countries: 'country',
    Languages: 'language',
    Timezones: 'timezone'
};
const NAME_ROLES: Readonly<Partial<Record<CapCodeListKind, string>>> = {
    currency: 'currency_name',
    country: 'country_name'
};
const CODE_ROLES: Readonly<Record<CapCodeListKind, string>> = {
    currency: 'currency',
    country: 'country',
    language: 'language',
    timezone: 'timezone',
    unit: 'unit_of_measure'
};
// SAP Gateway reserves the `SAP__` prefix, so these names cannot collide with an application's own sets.
const GATEWAY_CODE_LISTS: Readonly<Record<string, { kind: CapCodeListKind; codeProperty: string }>> = {
    SAP__Currencies: { kind: 'currency', codeProperty: 'CurrencyCode' },
    SAP__UnitsOfMeasure: { kind: 'unit', codeProperty: 'UnitCode' }
};

function keyNames(entity: SchemaEntity): ReadonlyArray<string> {
    return entity.properties.filter((property) => property.isKey).map((property) => property.name);
}

/**
 * The standard code list an entity set is, when both its name and its key shape match: for CAP a
 * single `code` key, or `locale` plus `code` for the text entity; for SAP Gateway the single code key
 * of `SAP__Currencies` or `SAP__UnitsOfMeasure`.
 *
 * @param entity schema entity
 * @returns the code list, or undefined for any other entity
 */
export function capCodeList(entity: SchemaEntity): CapCodeList | undefined {
    const keys = keyNames(entity);
    const gateway = Object.hasOwn(GATEWAY_CODE_LISTS, entity.entitySetName)
        ? GATEWAY_CODE_LISTS[entity.entitySetName]
        : undefined;
    if (gateway) {
        return keys.length === 1 && keys[0] === gateway.codeProperty ? { ...gateway, texts: false } : undefined;
    }
    const match = CAP_CODE_LIST.exec(entity.entitySetName);
    if (!match) {
        return undefined;
    }
    const texts = match[2] !== undefined;
    const expected = texts ? ['code', 'locale'] : ['code'];
    if (keys.length !== expected.length || !expected.every((name) => keys.includes(name))) {
        return undefined;
    }
    return { kind: KINDS[match[1]], texts, codeProperty: 'code' };
}

/**
 * The fixed meaning of a standard code-list column. Columns with a matching semantic role are routed to
 * it; columns without one (a currency symbol, an ISO numeric code, a language or time-zone name) are
 * companions that the code-list provider fills from the row's code.
 *
 * @param entity schema entity
 * @param property one of its properties
 * @returns the decision, or undefined when the entity is not a standard code list or the column is not a known one
 */
export function capCodeListField(entity: SchemaEntity, property: SchemaProperty): CapCodeListField | undefined {
    const codeList = capCodeList(entity);
    if (!codeList) {
        return undefined;
    }
    if (property.name === codeList.codeProperty) {
        return { role: CODE_ROLES[codeList.kind] };
    }
    switch (property.name.toLowerCase()) {
        case 'locale':
            return codeList.texts ? { role: 'language' } : undefined;
        case 'name':
        case 'descr':
        case 'text': {
            const role = NAME_ROLES[codeList.kind];
            return role ? { role } : { companion: true };
        }
        case 'minor':
        case 'minorunit':
        case 'decimalplaces':
            return codeList.kind === 'currency' && property.primitiveType === 'int'
                ? { role: 'decimal_places' }
                : { companion: true };
        case 'symbol':
        case 'numcode':
        case 'exponent':
            return codeList.kind === 'currency' ? { companion: true } : undefined;
        case 'isocode':
        case 'externalcode':
            return codeList.kind === 'currency' || codeList.kind === 'unit' ? { companion: true } : undefined;
        default:
            return undefined;
    }
}
