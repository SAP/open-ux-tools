export type PrimitiveType =
    'string' | 'int' | 'decimal' | 'date' | 'datetime' | 'datetimeoffset' | 'bool' | 'guid' | 'binary' | 'time';

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
}

export interface SchemaEntity {
    name: string;
    entitySetName: string;
    codeList?: 'currency' | 'unit';
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
}
