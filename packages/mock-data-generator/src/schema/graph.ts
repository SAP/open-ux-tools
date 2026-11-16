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

/** A scalar value of the schema: an annotation value, an enumeration member or a constant. */
export type SchemaScalar = string | number | boolean;

export interface SchemaAnnotation {
    term: string;
    value?: SchemaScalar;
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
    enumValues?: ReadonlyArray<SchemaScalar>;
    /**
     * A value help without an inline collection (V2 `sap:value-list`): values come from a code list. Kept apart
     * from `annotations`, which feed the classifier.
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
    constant?: SchemaScalar;
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

/** A property whose type has no generatable inline JSON value (such as `Edm.Stream`); rows omit it. */
export interface SchemaOmittedProperty {
    name: string;
    declaredType: string;
}

/** A declared entity set the generator cannot produce rows for, with the reason. */
export interface SchemaSkippedEntitySet {
    entitySetName: string;
    reason: string;
    /** Set for a contained entity whose rows cannot be generated. */
    containedBy?: SchemaContainment;
}

/** Where rows of a type without an entity set live: in their containing rows (OData `ContainsTarget`). */
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
    /** The entity set of the rows; a contained entity uses its path `Container/navigation`, which no set can take. */
    entitySetName: string;
    /** Set for an entity type whose rows live inside the rows that contain them. */
    containedBy?: SchemaContainment;
    codeList?: 'currency' | 'unit';
    /** The business identifier beside the technical key (`Common.SemanticKey`); unique within the entity set. */
    semanticKey?: ReadonlyArray<string>;
    /** Further identifying property sets (`Core.AlternateKeys`); each is unique within the entity set. */
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
    /** How many containment paths were left out because the service reached its limit of contained entities. */
    omittedContainmentPaths?: number;
    /**
     * Value-list entity sets a per-entity-set request asks rows of: their supplied rows are not the whole domain, so
     * the requested rows are added after them.
     */
    requestedValueListGrowth?: ReadonlySet<string>;
}

const OBJECT_PROTOTYPE_KEYS: ReadonlySet<string> = new Set(Object.getOwnPropertyNames(Object.prototype));

/**
 * Whether a repeated semantic-key property identifies the referencing row itself, so it is not copied: the entity
 * references its own entity set, or the copy would make its whole semantic key the referenced row's.
 *
 * @param source - the referencing entity
 * @param target - the referenced entity
 * @param name - the repeated property
 * @returns true when copying the referenced value would take the referencing row's identity
 */
export function identifiesReferencingRow(source: SchemaEntity, target: SchemaEntity, name: string): boolean {
    const own = source.semanticKey ?? [];
    if (!own.includes(name)) {
        return false;
    }
    const referenced = target.semanticKey ?? [];
    return source.entitySetName === target.entitySetName || own.every((member) => referenced.includes(member));
}

/**
 * Why an entity set named like an inherited `Object.prototype` property (`constructor`, `__proto__`) is skipped:
 * rows are kept in objects keyed by entity set name.
 *
 * @param entitySetName - the entity set name
 * @returns the skip reason, or undefined for a supported name
 */
export function inheritedNameSkipReason(entitySetName: string): string | undefined {
    return OBJECT_PROTOTYPE_KEYS.has(entitySetName) ? 'name is a property every JavaScript object inherits' : undefined;
}
