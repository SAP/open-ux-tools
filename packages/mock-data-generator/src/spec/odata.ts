import type { PrimitiveType } from '../schema/graph.js';

/**
 * OData protocol and SAP annotation names the generator reads. Each block names its specification.
 * Annotation terms are compared in lower case: a V4 term is matched by its qualified-name suffix
 * (`.<term>`), whatever alias the service declares for its vocabulary namespace.
 */

/**
 * The entity-set prefix SAP Gateway reserves for the sets it adds to every service (code lists, PDF
 * export formats, value helps and other protocol plumbing).
 *
 * @see https://github.com/SAP/odata-vocabularies/blob/main/docs/v4-annotations.md
 */
export const SAP_PROTOCOL_ENTITY_SET_PREFIX = 'SAP__';

/**
 * SAP annotations for OData V2 (namespace `http://www.sap.com/Protocols/SAPData`): the property
 * attributes the parser lifts into annotations, with the term name they get.
 *
 * @see https://github.com/SAP/odata-vocabularies/blob/main/docs/v2-annotations.md
 */
export const SAP_V2_TERM = Object.freeze({
    semantics: 'sap:semantics',
    unit: 'sap:unit',
    text: 'sap:text',
    displayFormat: 'sap:display-format',
    fieldControl: 'sap:field-control'
} as const);

/** The V2 property attributes lifted into annotations, in precedence order, as `[attribute, term]`. */
export const SAP_V2_PROPERTY_ATTRIBUTES: ReadonlyArray<readonly [string, string]> = [
    ['semantics', SAP_V2_TERM.semantics],
    ['unit', SAP_V2_TERM.unit],
    ['text', SAP_V2_TERM.text],
    ['display-format', SAP_V2_TERM.displayFormat],
    ['field-control', SAP_V2_TERM.fieldControl]
];

/** Values of the V2 `sap:display-format` attribute. */
export const SAP_V2_DISPLAY_FORMAT = Object.freeze({
    /** An `Edm.DateTime` that carries a date only. */
    date: 'Date',
    /** A string of digits without sign, compared in lower case. */
    nonNegative: 'nonnegative'
} as const);

/** The V2 `sap:semantics` value that marks a currency code. */
export const SAP_V2_SEMANTICS_CURRENCY_CODE = 'currency-code';
/** The V2 `sap:semantics` value that marks a country code, compared in lower case. */
export const SAP_V2_SEMANTICS_COUNTRY = 'country';

/**
 * Lower-case qualified-name suffixes of the OData V4 vocabulary terms the generator reads:
 * OASIS `Org.OData.Measures.V1` and `Org.OData.Core.V1`, and SAP `Common`, `Communication`,
 * `CodeList` and `UI` (github.com/SAP/odata-vocabularies, main).
 *
 * @see https://github.com/oasis-tcs/odata-vocabularies
 * @see https://github.com/SAP/odata-vocabularies
 */
export const VOCABULARY_TERM_SUFFIX = Object.freeze({
    /** `Measures.ISOCurrency`. */
    isoCurrency: '.isocurrency',
    /** `Measures.Unit`. */
    unit: '.unit',
    /** `Common.IsCurrency`. */
    isCurrency: '.iscurrency',
    /** `Common.IsCountry`. */
    isCountry: '.iscountry',
    /** `Common.Text`. */
    text: '.text',
    /** `Common.ValueList`. */
    valueList: '.valuelist',
    /** `Common.ValueListReferences`. */
    valueListReferences: '.valuelistreferences',
    /** `Common.ValueListWithFixedValues`. */
    valueListWithFixedValues: '.valuelistwithfixedvalues',
    /** `Common.ValueListMapping`. */
    valueListMapping: '.valuelistmapping',
    /** `Common.FieldControl`. */
    fieldControl: '.fieldcontrol',
    /** `Common.DocumentationRef`. */
    documentationRef: '.documentationref',
    /** `UI.DisplayFormat` style terms. */
    displayFormat: '.displayformat',
    /** `CodeList.CurrencyCodes`. */
    currencyCodes: '.currencycodes',
    /** `CodeList.UnitsOfMeasure`. */
    unitsOfMeasure: '.unitsofmeasure',
    /** Currency path terms such as `Measures.ISOCurrency` addressed by their last segment. */
    currency: '.currency'
} as const);

/**
 * The generator's primitive type of each EDM primitive type it can write inline (OData CSDL XML 4.01,
 * section 4.4, plus the V2 types `Edm.DateTime` and `Edm.Time`). `Edm.Stream`, `Edm.Duration` and the
 * geospatial types are absent: they have no generatable inline JSON value.
 *
 * @see https://docs.oasis-open.org/odata/odata-csdl-xml/v4.01/odata-csdl-xml-v4.01.html#sec_PrimitiveTypes
 */
export const EDM_PRIMITIVE_TYPES: Readonly<Record<string, PrimitiveType>> = Object.freeze({
    'Edm.String': 'string',
    'Edm.Byte': 'int',
    'Edm.SByte': 'int',
    'Edm.Int16': 'int',
    'Edm.Int32': 'int',
    'Edm.Int64': 'int',
    'Edm.Decimal': 'decimal',
    'Edm.Double': 'decimal',
    'Edm.Single': 'decimal',
    'Edm.Boolean': 'bool',
    'Edm.Guid': 'guid',
    'Edm.Date': 'date',
    'Edm.DateTime': 'datetime',
    'Edm.DateTimeOffset': 'datetimeoffset',
    'Edm.Binary': 'binary',
    'Edm.Time': 'time',
    'Edm.TimeOfDay': 'time'
});

/**
 * Value ranges of the EDM integer types (OData CSDL 4.01 section 4.4). `Edm.Int64` is bounded by the
 * safe JavaScript integer range, since JSON numbers beyond it lose precision.
 */
export const EDM_INTEGER_BOUNDS: Readonly<
    Record<string, Readonly<{ numericMinimum: number; numericMaximum: number }>>
> = Object.freeze({
    'Edm.Byte': { numericMinimum: 0, numericMaximum: 255 },
    'Edm.SByte': { numericMinimum: -128, numericMaximum: 127 },
    'Edm.Int16': { numericMinimum: -32_768, numericMaximum: 32_767 },
    'Edm.Int32': { numericMinimum: -2_147_483_648, numericMaximum: 2_147_483_647 },
    'Edm.Int64': { numericMinimum: Number.MIN_SAFE_INTEGER, numericMaximum: Number.MAX_SAFE_INTEGER }
});

/** The V2 date-time type that `sap:display-format="Date"` narrows to a date. */
export const EDM_V2_DATETIME = 'Edm.DateTime';

/**
 * The constant and path expressions of an annotation the parser reads as an inline attribute, in
 * precedence order (OData CSDL XML 4.01, sections 14.4 "Constant Expressions" and 14.5 "Dynamic
 * Expressions").
 *
 * @see https://docs.oasis-open.org/odata/odata-csdl-xml/v4.01/odata-csdl-xml-v4.01.html#sec_ConstantExpression
 */
export const CSDL_INLINE_EXPRESSION_KINDS: ReadonlyArray<string> = [
    'String',
    'Bool',
    'Int',
    'Float',
    'Decimal',
    'Date',
    'DateTimeOffset',
    'TimeOfDay',
    'Guid',
    'Duration',
    'EnumMember',
    'PropertyPath',
    'NavigationPropertyPath',
    'AnnotationPath',
    'Path'
];
