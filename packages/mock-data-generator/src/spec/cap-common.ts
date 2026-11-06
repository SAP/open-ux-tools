/**
 * Standard code lists and their column names.
 *
 * - SAP CAP `@sap/cds/common` (cds 8/9): the `sap.common.Currencies`, `Countries`, `Languages` and
 *   `Timezones` code lists, each keyed by `code`, and their localized `_texts` entities keyed by
 *   `locale` and `code`. Exposed names may carry a namespace prefix such as `common_Currencies_texts`.
 * - SAP Gateway (OData V4 for the ABAP RESTful Application Programming Model): the `SAP__Currencies`
 *   and `SAP__UnitsOfMeasure` code lists referenced through `Org.OData.Core`/`Common.CodeList`.
 *
 * Column names are compared in lower case.
 *
 * @see https://cap.cloud.sap/docs/cds/common
 * @see https://github.com/SAP/odata-vocabularies/blob/main/vocabularies/CodeList.md
 */
import { SAP_PROTOCOL_ENTITY_SET_PREFIX } from './odata.js';

export type CapCodeListKind = 'currency' | 'country' | 'language' | 'timezone' | 'unit';

/** A CAP code-list entity set name, optionally namespace-prefixed and optionally its `_texts` entity. */
export const CAP_CODE_LIST_ENTITY_SET = /^(?:[A-Za-z0-9]+_)*(Currencies|Countries|Languages|Timezones)(_texts)?$/u;

/** The kind of each CAP code list, by its entity name. */
export const CAP_CODE_LIST_KINDS: Readonly<Record<string, CapCodeListKind>> = {
    Currencies: 'currency',
    Countries: 'country',
    Languages: 'language',
    Timezones: 'timezone'
};

/** The key column of a CAP code list. */
export const CAP_CODE_PROPERTY = 'code';
/** The language key column of a CAP `_texts` entity. */
export const CAP_LOCALE_PROPERTY = 'locale';

/** SAP Gateway code lists; the reserved `SAP__` prefix keeps them apart from application entity sets. */
export const GATEWAY_CODE_LISTS: Readonly<Record<string, { kind: CapCodeListKind; codeProperty: string }>> = {
    [`${SAP_PROTOCOL_ENTITY_SET_PREFIX}Currencies`]: { kind: 'currency', codeProperty: 'CurrencyCode' },
    [`${SAP_PROTOCOL_ENTITY_SET_PREFIX}UnitsOfMeasure`]: { kind: 'unit', codeProperty: 'UnitCode' }
};

/** Lower-case column names of the standard code lists, besides their key. */
export const CODE_LIST_COLUMN = Object.freeze({
    name: 'name',
    descr: 'descr',
    text: 'text',
    symbol: 'symbol',
    minor: 'minor',
    minorUnit: 'minorunit',
    decimalPlaces: 'decimalplaces',
    numCode: 'numcode',
    exponent: 'exponent',
    isoCode: 'isocode',
    externalCode: 'externalcode'
} as const);

/** The code-list columns whose value is derived from the row's code. */
export const CODE_LIST_DERIVED_COLUMNS: ReadonlySet<string> = new Set([
    CODE_LIST_COLUMN.name,
    CODE_LIST_COLUMN.descr,
    CODE_LIST_COLUMN.text,
    CODE_LIST_COLUMN.symbol,
    CODE_LIST_COLUMN.minor,
    CODE_LIST_COLUMN.minorUnit,
    CODE_LIST_COLUMN.decimalPlaces,
    CODE_LIST_COLUMN.numCode,
    CODE_LIST_COLUMN.isoCode,
    CODE_LIST_COLUMN.externalCode
]);
