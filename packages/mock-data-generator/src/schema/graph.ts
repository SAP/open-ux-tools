/** The generator's primitive types, to which every EDM and CDS scalar type is mapped. */
export const PRIMITIVE_TYPES = [
    'string',
    'int',
    'decimal',
    'date',
    'datetime',
    'datetimeoffset',
    'bool',
    'guid',
    'binary',
    'time'
] as const;
export type PrimitiveType = (typeof PRIMITIVE_TYPES)[number];

export interface SchemaAnnotation {
    term: string;
    value?: string | number | boolean;
    expressionKind?: string;
}

export interface SchemaProperty {
    name: string;
    declaredType?: string;
    primitiveType: PrimitiveType;
    nullable: boolean;
    isKey: boolean;
    maxLength?: number;
    precision?: number;
    scale?: number;
    numericMinimum?: number;
    numericMaximum?: number;
    label?: string;
    description?: string;
    dataElement?: string;
    enumValues?: ReadonlyArray<string | number | boolean>;
    /**
     * A value help is declared for the field without an inline collection (V2 `sap:value-list`), so its
     * values come from a code list. Kept apart from `annotations`, which feed the classifier.
     */
    valueHelp?: boolean;
    links?: Readonly<{
        text?: string;
        unit?: string;
        currency?: string;
        scale?: string;
        standardCode?: string;
        valueListCollection?: string;
        valueListMappings?: ReadonlyArray<Readonly<{ localProperty: string; valueListProperty: string }>>;
        valueListParameters?: ReadonlyArray<SchemaValueListParameter>;
    }>;
    annotations: ReadonlyArray<SchemaAnnotation>;
}

export type SchemaValueListParameterDirection = 'In' | 'Out' | 'InOut' | 'DisplayOnly';

/**
 * The direction a `Common.ValueListParameter*` record type declares, in EDMX and CSN alike.
 *
 * @param type the record type, such as `com.sap.vocabularies.Common.v1.ValueListParameterInOut`
 * @returns the direction, or undefined when the type is not a value-list parameter type
 * @example
 * valueListParameterDirection('Common.ValueListParameterInOut'); // 'InOut'
 */
export function valueListParameterDirection(type: string): SchemaValueListParameterDirection | undefined {
    const direction = /ValueListParameter(InOut|In|Out|DisplayOnly)$/u.exec(type)?.[1];
    return direction === 'In' || direction === 'Out' || direction === 'InOut' || direction === 'DisplayOnly'
        ? direction
        : undefined;
}

export interface SchemaValueListParameter {
    direction: SchemaValueListParameterDirection;
    localProperty?: string;
    valueListProperty?: string;
    constant?: string | number | boolean;
}

export interface SchemaStructuredProperty {
    name: string;
    kind: 'complex' | 'collection';
    declaredType: string;
    elementType: string;
    nullable: boolean;
    annotations: ReadonlyArray<SchemaAnnotation>;
}

export interface SchemaComplexType {
    name: string;
    qualifiedName: string;
    properties: ReadonlyArray<SchemaProperty>;
    structuredProperties: ReadonlyArray<SchemaStructuredProperty>;
}

/**
 * A declared property whose type has no inline JSON value the generator can produce, such as
 * `Edm.Stream`, a geospatial type, or an undeclared type. Rows omit it, as they omit structured
 * properties.
 */
export interface SchemaOmittedProperty {
    name: string;
    declaredType: string;
}

/**
 * A declared entity set the generator cannot produce rows for, because its entity type is not
 * resolvable in the document or one of its keys has no generatable type.
 */
export interface SchemaSkippedEntitySet {
    entitySetName: string;
    reason: string;
    /** Set for a contained entity whose rows cannot be generated. */
    containedBy?: SchemaContainment;
}

/**
 * Where the rows of an entity type without an entity set live: inside the rows of the entity set or contained
 * entity that contains them (OData `ContainsTarget`), under the containment navigation.
 */
export interface SchemaContainment {
    /** The entity set, or contained entity, whose rows hold these rows. */
    readonly entitySetName: string;
    /** The containment navigation of the containing rows. */
    readonly navigation: string;
    /** Whether each containing row holds a list of these rows, or at most one. */
    readonly isCollection: boolean;
}

export interface SchemaEntity {
    name: string;
    /**
     * The entity set of the rows. A contained entity has none and is named by its containment path instead,
     * `Container/navigation`, which no entity set name can take.
     */
    entitySetName: string;
    /** Set for an entity type whose rows live inside the rows that contain them. */
    containedBy?: SchemaContainment;
    codeList?: 'currency' | 'unit';
    /**
     * The properties that identify a row to people (`Common.SemanticKey`), when the service declares them:
     * a business identifier beside a technical key. Their values are unique within the entity set.
     */
    semanticKey?: ReadonlyArray<string>;
    /**
     * Further property sets that identify a row (`Core.AlternateKeys`), when the service declares them; the values
     * of each set are unique within the entity set.
     */
    alternateKeys?: ReadonlyArray<ReadonlyArray<string>>;
    properties: ReadonlyArray<SchemaProperty>;
    structuredProperties?: ReadonlyArray<SchemaStructuredProperty>;
    omittedProperties?: ReadonlyArray<SchemaOmittedProperty>;
}

export interface SchemaRelationship {
    name: string;
    fromEntitySet: string;
    toEntitySet: string;
    mappings: ReadonlyArray<Readonly<{ sourceProperty: string; targetProperty: string }>>;
    provenance?: 'explicit' | 'inferred';
    confidence?: number;
    targetCardinality?: 'one' | 'zero-or-one' | 'many';
    containsTarget?: boolean;
    partner?: string;
}

export interface SchemaGraph {
    namespace: string;
    entities: ReadonlyArray<SchemaEntity>;
    relationships: ReadonlyArray<SchemaRelationship>;
    complexTypes?: ReadonlyArray<SchemaComplexType>;
    skippedEntitySets?: ReadonlyArray<SchemaSkippedEntitySet>;
    /**
     * Value-list entity sets that a per-entity-set request asks rows of. For this request their supplied rows
     * are not the whole domain, so the requested rows are added after them.
     */
    requestedValueListGrowth?: ReadonlySet<string>;
}
