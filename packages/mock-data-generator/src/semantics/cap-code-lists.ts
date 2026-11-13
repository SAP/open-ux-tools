import type { SchemaEntity, SchemaProperty } from '../schema/graph.js';
import {
    CAP_CODE_LIST_ENTITY_SET,
    CAP_CODE_LIST_KINDS,
    CAP_CODE_PROPERTY,
    CAP_LOCALE_PROPERTY,
    CODE_LIST_COLUMN,
    GATEWAY_CODE_LISTS,
    type CapCodeListKind
} from '../spec/cap-common.js';

/**
 * Standard code lists (CAP `@sap/cds/common` and SAP Gateway `SAP__Currencies`, `SAP__UnitsOfMeasure`) whose columns
 * have fixed meanings, so they are decided from metadata and filled by `applyCapCodeListMetadata`.
 */
export type { CapCodeListKind } from '../spec/cap-common.js';

interface CapCodeList {
    kind: CapCodeListKind;
    /** The localized text entity, keyed by `locale` and `code`. */
    texts: boolean;
    /** The key column that holds the code. */
    codeProperty: string;
}

/** How one column of a standard code list is decided. */
type CapCodeListField = { role: string } | { companion: true };

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
    const match = CAP_CODE_LIST_ENTITY_SET.exec(entity.entitySetName);
    if (!match) {
        return undefined;
    }
    const texts = match[2] !== undefined;
    const expected = texts ? [CAP_CODE_PROPERTY, CAP_LOCALE_PROPERTY] : [CAP_CODE_PROPERTY];
    if (keys.length !== expected.length || !expected.every((name) => keys.includes(name))) {
        return undefined;
    }
    return { kind: CAP_CODE_LIST_KINDS[match[1]], texts, codeProperty: CAP_CODE_PROPERTY };
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
        case CAP_LOCALE_PROPERTY:
            return codeList.texts ? { role: 'language' } : undefined;
        case CODE_LIST_COLUMN.name:
        case CODE_LIST_COLUMN.descr:
        case CODE_LIST_COLUMN.text: {
            const role = NAME_ROLES[codeList.kind];
            return role ? { role } : { companion: true };
        }
        case CODE_LIST_COLUMN.minor:
        case CODE_LIST_COLUMN.minorUnit:
        case CODE_LIST_COLUMN.decimalPlaces:
            return codeList.kind === 'currency' && property.primitiveType === 'int'
                ? { role: 'decimal_places' }
                : { companion: true };
        case CODE_LIST_COLUMN.symbol:
        case CODE_LIST_COLUMN.numCode:
        case CODE_LIST_COLUMN.exponent:
            return codeList.kind === 'currency' ? { companion: true } : undefined;
        case CODE_LIST_COLUMN.isoCode:
        case CODE_LIST_COLUMN.externalCode:
            return codeList.kind === 'currency' || codeList.kind === 'unit' ? { companion: true } : undefined;
        default:
            return undefined;
    }
}
