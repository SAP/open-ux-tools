/**
 * Facets provide further details on types definitions, terms or properties
 * https://docs.oasis-open.org/odata/odata-csdl-xml/v4.01/odata-csdl-xml-v4.01.html#sec_TypeFacets
 */
export interface Facets {
    /**
     * Whether the property can have the value null
     * OData attribute - Nullable
     */
    isNullable?: boolean;
    /**
     * Maximum length of a binary, stream or string value; no usage in supported vocabularies
     * OData attribute - MaxLength
     */
    maxLength?: number;
    /**
     * For a decimal value: the maximum number of significant decimal digits.
     * For a temporal value (e.g. time of dat): the number of decimal places allowed in the seconds
     *
     * OData attribute - Precision
     */
    precision?: number;
    /**
     * A non-negative integer value specifying the maximum number of digits allowed to the right of the decimal point, or one of the symbolic values floating or variable.
     *
     * OData attribute - Scale
     */
    scale?: number | string;
    /**
     * For a string property the Unicode facet indicates whether the property might contain and accept string values with Unicode characters (code points) beyond the ASCII character set.
     * The value false indicates that the property will only contain and accept string values with characters limited to the ASCII character set.
     * If no value is specified, the Unicode facet defaults to true.
     *
     * OData attribute - Unicode
     */
    supportsUnicode?: boolean;
    /**
     * For a geometry or geography property the SRID facet identifies which spatial reference system is applied to values of the property on type instances.
     * The value of the SRID facet MUST be a non-negative integer or the special value variable.
     * If no value is specified, the attribute defaults to 0 for Geometry types or 4326 for Geography types.
     * The valid values of the SRID facet and their meanings are as defined by the European Petroleum Survey Group [EPSG].
     *
     * OData attribute - SRID
     */
    srid?: number | string;

    /**
     * A primitive or enumeration property MAY define a default value that is used if the property is not explicitly represented in an annotation or the body of a POST or PUT request.
     * If no value is specified, the client SHOULD NOT assume a default value.
     *
     * OData attribute - DefaultValue
     */
    defaultValue?: unknown;
}
