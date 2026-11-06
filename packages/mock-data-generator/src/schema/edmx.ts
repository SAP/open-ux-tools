import { XMLParser } from 'fast-xml-parser';
import type {
    PrimitiveType,
    SchemaAnnotation,
    SchemaComplexType,
    SchemaContainment,
    SchemaEntity,
    SchemaGraph,
    SchemaOmittedProperty,
    SchemaProperty,
    SchemaRelationship,
    SchemaSkippedEntitySet,
    SchemaStructuredProperty,
    SchemaValueListParameter
} from './graph.js';
import { valueListParameterDirection } from './graph.js';
import { compareCodePoints } from '../ordering.js';
import { isRecord } from '../guards.js';
import {
    CSDL_INLINE_EXPRESSION_KINDS,
    EDM_INTEGER_BOUNDS,
    EDM_PRIMITIVE_TYPES,
    EDM_V2_DATETIME,
    SAP_V2_DISPLAY_FORMAT,
    SAP_V2_PROPERTY_ATTRIBUTES,
    SAP_V2_SEMANTICS_CURRENCY_CODE,
    SAP_V2_TERM,
    VOCABULARY_TERM_SUFFIX
} from '../spec/odata.js';
import { DRAFT_ADMINISTRATIVE_DATA_TYPE, DRAFT_KEY_PROPERTY_NAMES, DRAFT_NAVIGATION_NAMES } from '../spec/draft.js';
import { MOCKGEN_ERROR_CODE, MockGenError } from '../errors.js';

type XmlRecord = Record<string, unknown>;

function asArray(value: unknown): XmlRecord[] {
    if (Array.isArray(value)) {
        return value.filter(isRecord);
    }
    return isRecord(value) ? [value] : [];
}

/**
 * The text values of an element that may repeat, such as the `PropertyPath` items of a collection.
 *
 * @param value - One text value or an array of them.
 * @returns The non-empty strings in document order.
 */
function asArrayOfStrings(value: unknown): string[] {
    return (Array.isArray(value) ? value : [value]).filter(
        (item): item is string => typeof item === 'string' && item.length > 0
    );
}

function requiredString(value: unknown, label: string): string {
    if (typeof value !== 'string' || value.length === 0) {
        throw new MockGenError(MOCKGEN_ERROR_CODE.METADATA_INVALID, `EDMX ${label} must be a non-empty string`);
    }
    return value;
}

function optionalInteger(value: unknown): number | undefined {
    if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) {
        return value;
    }
    if (typeof value === 'string' && /^\d+$/.test(value)) {
        return Number(value);
    }
    return undefined;
}

/**
 * Map a declared EDM primitive type to the generator's primitive type.
 *
 * @param type - Declared property type.
 * @returns The primitive type, or undefined for a type that has no generatable inline JSON value,
 * such as `Edm.Stream`, the geospatial types, `Edm.Duration`, or a name that is not an EDM type.
 */
function primitiveType(type: string): PrimitiveType | undefined {
    return Object.hasOwn(EDM_PRIMITIVE_TYPES, type) ? EDM_PRIMITIVE_TYPES[type] : undefined;
}

function integerBounds(type: string): Readonly<{ numericMinimum: number; numericMaximum: number }> | undefined {
    return Object.hasOwn(EDM_INTEGER_BOUNDS, type) ? EDM_INTEGER_BOUNDS[type] : undefined;
}

/**
 * Convert a constant expression to the JSON type its EDM expression kind declares.
 * The XML parser keeps every value as text, so typing follows the expression, never the spelling.
 *
 * @param kind - The expression attribute name, such as Bool or String.
 * @param value - The raw attribute value.
 * @returns The typed value, or the raw value when it is not a valid literal of that kind.
 */
function typedExpressionValue(kind: string, value: unknown): unknown {
    if (typeof value !== 'string') {
        return value;
    }
    switch (kind) {
        case 'Bool':
            return value === 'true' || value === 'false' ? value === 'true' : value;
        case 'Int':
            return /^-?\d+$/u.test(value) && Number.isSafeInteger(Number(value)) ? Number(value) : value;
        case 'Float':
        case 'Decimal':
            return value.trim() !== '' && Number.isFinite(Number(value)) ? Number(value) : value;
        default:
            return value;
    }
}

/**
 * Reduce supported primitive EDMX annotation expressions to the canonical form.
 *
 * @param value - One annotation node or an array of annotation nodes.
 * @returns Canonical annotations in document order.
 */
function parseAnnotations(value: unknown): SchemaAnnotation[] {
    return asArray(value).flatMap((annotation) => {
        const term = annotation.Term;
        if (typeof term !== 'string') {
            return [];
        }
        const valueEntry = CSDL_INLINE_EXPRESSION_KINDS.find((key) => annotation[key] !== undefined);
        const value = valueEntry ? typedExpressionValue(valueEntry, annotation[valueEntry]) : undefined;
        return [
            {
                term,
                ...(valueEntry ? { expressionKind: valueEntry } : {}),
                ...(typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
                    ? { value }
                    : {})
            }
        ];
    });
}

/**
 * Merge inline annotations, SAP V2 attributes, and V4 external annotations.
 *
 * @param property - Parsed EDMX property node.
 * @param externalAnnotations - Annotations addressed to the property through an external target.
 * @returns All property evidence in deterministic precedence order.
 */
function annotations(property: XmlRecord, externalAnnotations: ReadonlyArray<SchemaAnnotation>): SchemaAnnotation[] {
    const inline = parseAnnotations(property.Annotation);
    return [
        ...inline,
        ...SAP_V2_PROPERTY_ATTRIBUTES.flatMap(([attribute, term]) => {
            const value = property[attribute];
            return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
                ? [{ term, value }]
                : [];
        }),
        ...externalAnnotations
    ];
}

function metadataLinks(
    property: XmlRecord,
    externalAnnotationNodes: ReadonlyArray<XmlRecord>
): SchemaProperty['links'] | undefined {
    const annotationNodes = [...asArray(property.Annotation), ...externalAnnotationNodes];
    const pathForTerm = (suffix: string): string | undefined => {
        const annotation = annotationNodes.find(
            (candidate) =>
                typeof candidate.Term === 'string' && candidate.Term.toLowerCase().endsWith(suffix.toLowerCase())
        );
        const value = annotation?.Path ?? annotation?.PropertyPath;
        return typeof value === 'string' && value.length > 0 ? value : undefined;
    };
    const valueList = annotationNodes.find(
        (candidate) =>
            typeof candidate.Term === 'string' &&
            candidate.Term.toLowerCase().endsWith(VOCABULARY_TERM_SUFFIX.valueList)
    );
    const valueListPropertyValues = asArray(isRecord(valueList?.Record) ? valueList.Record.PropertyValue : undefined);
    const collectionPath = valueListPropertyValues.find(
        (propertyValue) => propertyValue.Property === 'CollectionPath'
    )?.String;
    const parameters = valueListPropertyValues.find((propertyValue) => propertyValue.Property === 'Parameters');
    const parameterRecords = asArray(isRecord(parameters?.Collection) ? parameters.Collection.Record : undefined);
    const valueListParameters: SchemaValueListParameter[] = parameterRecords.flatMap((record) => {
        const values = asArray(record.PropertyValue);
        const localProperty = values.find((value) => value.Property === 'LocalDataProperty')?.PropertyPath;
        const valueListProperty = values.find((value) => value.Property === 'ValueListProperty')?.String;
        const constant = values.find((value) => value.Property === 'Constant');
        const constantEntry = constant
            ? ['String', 'Bool', 'Int', 'Float', 'Decimal'].find((key) => constant[key] !== undefined)
            : undefined;
        const constantValue = constantEntry
            ? typedExpressionValue(constantEntry, constant?.[constantEntry])
            : undefined;
        const direction = typeof record.Type === 'string' ? valueListParameterDirection(record.Type) : undefined;
        const parameter: SchemaValueListParameter = {
            // Older metadata omits the ValueListParameter type. Treat that
            // mapping as InOut conservatively while retaining explicit types.
            direction: direction ?? 'InOut',
            ...(typeof localProperty === 'string' ? { localProperty } : {}),
            ...(typeof valueListProperty === 'string' ? { valueListProperty } : {}),
            ...(typeof constantValue === 'string' ||
            typeof constantValue === 'number' ||
            typeof constantValue === 'boolean'
                ? { constant: constantValue }
                : {})
        };
        return [parameter];
    });
    const valueListMappings = valueListParameters.flatMap(({ localProperty, valueListProperty }) =>
        localProperty && valueListProperty ? [{ localProperty, valueListProperty }] : []
    );
    const text = pathForTerm('.text') ?? (typeof property.text === 'string' ? property.text : undefined);
    const unit = pathForTerm('.unit') ?? (typeof property.unit === 'string' ? property.unit : undefined);
    const currency = pathForTerm('.isocurrency');
    const scale = pathForTerm('.unitspecificscale');
    const standardCode = pathForTerm('.standardcode');
    const valueListCollection =
        typeof collectionPath === 'string' && collectionPath.length > 0 ? collectionPath : undefined;
    return text ||
        unit ||
        currency ||
        scale ||
        standardCode ||
        valueListCollection ||
        valueListMappings.length > 0 ||
        valueListParameters.length > 0
        ? Object.freeze({
              ...(text ? { text } : {}),
              ...(unit ? { unit } : {}),
              ...(currency ? { currency } : {}),
              ...(scale ? { scale } : {}),
              ...(standardCode ? { standardCode } : {}),
              ...(valueListCollection ? { valueListCollection } : {}),
              ...(valueListMappings.length > 0 ? { valueListMappings: Object.freeze(valueListMappings) } : {}),
              ...(valueListParameters.length > 0 ? { valueListParameters: Object.freeze(valueListParameters) } : {})
          })
        : undefined;
}

/**
 * Extract an ABAP Dictionary data-element id from a SAP DocumentationRef.
 *
 * @param propertyAnnotations - Canonical property annotations.
 * @returns The declared data-element id for a `type=DE` reference.
 */
function documentationRefDataElement(propertyAnnotations: ReadonlyArray<SchemaAnnotation>): string | undefined {
    const reference = propertyAnnotations.find((annotation) =>
        annotation.term.toLowerCase().endsWith(VOCABULARY_TERM_SUFFIX.documentationRef)
    )?.value;
    if (typeof reference !== 'string' || !/type=DE\b/iu.test(reference)) {
        return undefined;
    }
    return /[?&]id=([a-z\d_]+)/iu.exec(reference)?.[1];
}

/**
 * Outcome of parsing one declared property: a generatable scalar, a structured (complex or
 * collection) property, or a property whose type has no generatable inline JSON value.
 */
type ParsedProperty =
    | Readonly<{ kind: 'scalar'; property: SchemaProperty }>
    | Readonly<{ kind: 'structured' }>
    | Readonly<{ kind: 'omitted'; property: SchemaOmittedProperty }>;

/**
 * The generator type of a declared scalar property.
 *
 * @param property - Parsed EDMX property node.
 * @param declaredType - Declared property type.
 * @param enumValues - Member names when the type is a declared enumeration.
 * @returns The primitive type, or undefined when the type has no generatable inline JSON value.
 */
function scalarPropertyType(
    property: XmlRecord,
    declaredType: string,
    enumValues: ReadonlyArray<string> | undefined
): PrimitiveType | undefined {
    if (declaredType === EDM_V2_DATETIME && property['display-format'] === SAP_V2_DISPLAY_FORMAT.date) {
        return 'date';
    }
    // An enumeration value is serialized as the member name, so the members are the declared domain.
    return primitiveType(declaredType) ?? (enumValues ? 'string' : undefined);
}

/**
 * The declared precision. CSDL requires a positive decimal precision; a declared 0 admits no digit,
 * so it is treated as unspecified.
 *
 * @param scalarType - Generator type of the property.
 * @param value - Declared Precision attribute.
 * @returns The usable precision, if any.
 */
function declaredPrecision(scalarType: PrimitiveType, value: unknown): number | undefined {
    const precision = optionalInteger(value);
    return scalarType === 'decimal' && precision === 0 ? undefined : precision;
}

function parseProperty(
    property: XmlRecord,
    keys: ReadonlySet<string>,
    structuredTypes: ReadonlySet<string>,
    enumMembers: ReadonlyMap<string, ReadonlyArray<string>>,
    externalAnnotationNodes: ReadonlyArray<XmlRecord>
): ParsedProperty {
    const name = requiredString(property.Name, 'property name');
    const declaredType = requiredString(property.Type, `type for ${name}`);
    if (/^Collection\(.+\)$/.test(declaredType) || structuredTypes.has(declaredType)) {
        return { kind: 'structured' };
    }
    const enumValues = enumMembers.get(declaredType);
    const scalarType = scalarPropertyType(property, declaredType, enumValues);
    if (scalarType === undefined) {
        return { kind: 'omitted', property: Object.freeze({ name, declaredType }) };
    }
    const propertyAnnotations = annotations(property, parseAnnotations(externalAnnotationNodes));
    const annotationString = (...suffixes: ReadonlyArray<string>): string | undefined => {
        const value = propertyAnnotations.find((annotation) =>
            suffixes.some((suffix) => annotation.term.endsWith(suffix))
        )?.value;
        return typeof value === 'string' ? value : undefined;
    };
    const label = annotationString('.Label') ?? (typeof property.label === 'string' ? property.label : undefined);
    const description =
        annotationString('.Description') ?? (typeof property.quickinfo === 'string' ? property.quickinfo : undefined);
    const dataElement =
        annotationString('.DataElement') ??
        (typeof property['data-element'] === 'string' ? property['data-element'] : undefined) ??
        documentationRefDataElement(propertyAnnotations);
    return {
        kind: 'scalar',
        property: {
            name,
            declaredType,
            primitiveType: scalarType,
            nullable: property.Nullable !== false && property.Nullable !== 'false',
            isKey: keys.has(name),
            maxLength: optionalInteger(property.MaxLength),
            precision: declaredPrecision(scalarType, property.Precision),
            scale: optionalInteger(property.Scale),
            ...integerBounds(declaredType),
            ...(label ? { label } : {}),
            ...(description ? { description } : {}),
            ...(dataElement ? { dataElement } : {}),
            ...(enumValues ? { enumValues } : {}),
            ...(typeof property['value-list'] === 'string' ? { valueHelp: true } : {}),
            ...(metadataLinks(property, externalAnnotationNodes)
                ? { links: metadataLinks(property, externalAnnotationNodes) }
                : {}),
            annotations: propertyAnnotations
        }
    };
}

function parseStructuredProperty(
    property: XmlRecord,
    structuredTypes: ReadonlySet<string>,
    externalAnnotationNodes: ReadonlyArray<XmlRecord>
): SchemaStructuredProperty | undefined {
    const name = requiredString(property.Name, 'property name');
    const declaredType = requiredString(property.Type, `type for ${name}`);
    const collectionMatch = /^Collection\((.+)\)$/.exec(declaredType);
    const elementType = collectionMatch?.[1] ?? declaredType;
    if (!collectionMatch && !structuredTypes.has(declaredType)) {
        return undefined;
    }
    return Object.freeze({
        name,
        kind: collectionMatch ? ('collection' as const) : ('complex' as const),
        declaredType,
        elementType,
        nullable: property.Nullable !== false && property.Nullable !== 'false',
        annotations: Object.freeze(annotations(property, parseAnnotations(externalAnnotationNodes)))
    });
}

function unqualifiedName(value: string): string {
    return value.split('/').at(-1) ?? value;
}

function entityTypeName(value: unknown): string | undefined {
    if (typeof value !== 'string') {
        return undefined;
    }
    const match = /^Collection\((.+)\)$/.exec(value);
    return match?.[1] ?? value;
}

function propertyRefs(value: unknown): string[] {
    return asArray(value).map((entry) => requiredString(entry.Name, 'referential constraint property'));
}

function navigationTargetCardinality(navigation: XmlRecord): SchemaRelationship['targetCardinality'] | undefined {
    if (typeof navigation.Type !== 'string') {
        return undefined;
    }
    const type = navigation.Type;
    if (/^Collection\(.+\)$/.test(type)) {
        return 'many';
    }
    return navigation.Nullable === false || navigation.Nullable === 'false' ? 'one' : 'zero-or-one';
}

function associationTargetCardinality(multiplicity: unknown): SchemaRelationship['targetCardinality'] {
    if (multiplicity === '*') {
        return 'many';
    }
    return multiplicity === '1' ? 'one' : 'zero-or-one';
}

/**
 * Record the member names of each enumeration type a schema declares, under its namespace- and
 * alias-qualified names. An enumeration without members has no generatable value and is skipped.
 *
 * @param schema - Parsed EDMX schema node.
 * @param namespace - Schema namespace.
 * @param alias - Schema alias, if declared.
 * @param enumMembers - Receives qualified enumeration name to member names.
 */
function collectEnumMembers(
    schema: XmlRecord,
    namespace: string,
    alias: string | undefined,
    enumMembers: Map<string, ReadonlyArray<string>>
): void {
    for (const enumType of asArray(schema.EnumType)) {
        const name = requiredString(enumType.Name, 'enum type name');
        const members = Object.freeze(
            asArray(enumType.Member).flatMap((member) =>
                typeof member.Name === 'string' && member.Name.length > 0 ? [member.Name] : []
            )
        );
        if (members.length === 0) {
            continue;
        }
        enumMembers.set(`${namespace}.${name}`, members);
        if (alias) {
            enumMembers.set(`${alias}.${name}`, members);
        }
    }
}

/**
 * Why an entity set cannot be generated because of its key, if it cannot.
 *
 * @param keyNames - Declared key property names.
 * @param omittedProperties - Properties whose type has no generatable inline JSON value.
 * @param structuredProperties - Complex and collection properties.
 * @returns The reason when a key has no generatable value; otherwise undefined.
 */
function ungeneratableKeyReason(
    keyNames: ReadonlySet<string>,
    omittedProperties: ReadonlyMap<string, SchemaOmittedProperty>,
    structuredProperties: ReadonlyMap<string, SchemaStructuredProperty>
): string | undefined {
    for (const keyName of keyNames) {
        const declaredType =
            omittedProperties.get(keyName)?.declaredType ?? structuredProperties.get(keyName)?.declaredType;
        if (declaredType !== undefined) {
            return `key ${keyName} has type ${declaredType}, which has no generatable value`;
        }
    }
    return undefined;
}

/**
 * Keep only relationships between declared scalar properties of generated entity sets. One that
 * reaches a skipped set, an omitted property, or a property the entity does not declare would write
 * values the schema cannot describe.
 *
 * @param entities - Generated entity sets.
 * @param relationships - Relationships read from the document.
 * @returns The relationships that can be generated.
 */
function generatableRelationships(
    entities: ReadonlyArray<SchemaEntity>,
    relationships: ReadonlyArray<SchemaRelationship>
): SchemaRelationship[] {
    const declared = new Map(
        entities.map(({ entitySetName, properties }) => [entitySetName, new Set(properties.map(({ name }) => name))])
    );
    return relationships.filter(({ fromEntitySet, toEntitySet, mappings }) =>
        mappings.every(
            ({ sourceProperty, targetProperty }) =>
                declared.get(fromEntitySet)?.has(sourceProperty) === true &&
                declared.get(toEntitySet)?.has(targetProperty) === true
        )
    );
}

/** Type names every schema of the document declares, under namespace- and alias-qualified names. */
interface SchemaTypeIndex {
    /** Namespace or alias to the namespace it names. */
    namespaceAliases: Map<string, string>;
    /** Qualified names of the declared complex types. */
    structuredTypes: Set<string>;
    /** Qualified enumeration name to its member names. */
    enumMembers: Map<string, ReadonlyArray<string>>;
}

/** An entity type and the schema that declares it. */
interface ResolvedEntityType {
    qualifiedType: string;
    schema: XmlRecord;
    entityType: XmlRecord;
}

/** What parsing the entity sets and singletons of a document reads. */
interface EdmxParseContext {
    /** The schemas of the document, in document order. */
    schemas: ReadonlyArray<XmlRecord>;
    /** Qualified names of the declared complex types. */
    structuredTypes: ReadonlySet<string>;
    /** Qualified enumeration name to its member names. */
    enumMembers: ReadonlyMap<string, ReadonlyArray<string>>;
    /** Annotations addressed through external targets, by canonical `Type/Property` target. */
    externalAnnotationNodes: ReadonlyMap<string, ReadonlyArray<XmlRecord>>;
    /** Annotations addressed to a whole type through external targets, by canonical type name. */
    typeAnnotationNodes: ReadonlyMap<string, ReadonlyArray<XmlRecord>>;
    /** Entity types by namespace- and alias-qualified name. */
    entityTypes: ReadonlyMap<string, ResolvedEntityType>;
}

/** An entity set or singleton whose rows can be generated, as declared in its container. */
interface DeclaredEntitySet {
    entitySet: XmlRecord;
    entitySetName: string;
    qualifiedType: string;
}

/** The entity sets and singletons read from all containers of a document. */
interface EntitySetCollection {
    /** Generatable entity sets, in document order. */
    entities: SchemaEntity[];
    /** Entity sets whose rows cannot be generated, with the reason. */
    skippedEntitySets: SchemaSkippedEntitySet[];
    /** Declared and canonical entity type name to the first entity set of that type. */
    entitySetByType: Map<string, string>;
    /** Generatable entity sets with their container nodes, in document order, then the contained entities. */
    entitySets: DeclaredEntitySet[];
    /**
     * Containment navigations, as `EntitySet/navigation`, whose target type has no entity set: their rows live
     * in the containing row, so no key mapping links them.
     */
    containedNavigations: Set<string>;
}

/** One navigation property of an entity set, with what every kind of relationship reads from it. */
/** A navigation's relationship, and whether it starts from the navigation's target: the target rows reference the source. */
interface NavigationRelationship {
    relationship: SchemaRelationship;
    fromTarget: boolean;
}

interface NavigationSource {
    /** The navigation property node. */
    navigation: XmlRecord;
    /** The navigation property name. */
    name: string;
    /** The entity set the navigation starts from. */
    entitySetName: string;
    /** Navigation property path to the bound target entity set name. */
    bindings: ReadonlyMap<string, string>;
    /** Cardinality, containment and partner of the navigation, when declared. */
    navigationDetails: Pick<SchemaRelationship, 'targetCardinality' | 'containsTarget' | 'partner'>;
    /** The qualified entity type the navigation leads to: its type, or the target end of its association. */
    targetType: string | undefined;
}

/**
 * Parse the EDMX XML and return its schemas.
 *
 * @param content - The EDMX document.
 * @returns The schema nodes in document order.
 * @throws {MockGenError} `METADATA_INVALID` when the document has no Edmx/DataServices or no Schema
 */
function readEdmxSchemas(content: string): XmlRecord[] {
    const parsed: unknown = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '',
        removeNSPrefix: true,
        // Values stay as written: a String such as "0042" or a Multiplicity of "1" must not become a number.
        // EDM-typed expressions (Bool, Int, Float, Decimal) are converted explicitly by typedExpressionValue.
        parseAttributeValue: false,
        parseTagValue: false
    }).parse(content);
    if (!isRecord(parsed) || !isRecord(parsed.Edmx) || !isRecord(parsed.Edmx.DataServices)) {
        throw new MockGenError(MOCKGEN_ERROR_CODE.METADATA_INVALID, 'EDMX document must contain Edmx/DataServices');
    }
    const schemas = asArray(parsed.Edmx.DataServices.Schema);
    if (schemas.length === 0) {
        throw new MockGenError(MOCKGEN_ERROR_CODE.METADATA_INVALID, 'EDMX document must contain at least one Schema');
    }
    return schemas;
}

/**
 * The alias of a schema, when it declares a non-empty one.
 *
 * @param schema - Parsed EDMX schema node.
 * @returns The alias, or undefined.
 */
function schemaAlias(schema: XmlRecord): string | undefined {
    return typeof schema.Alias === 'string' && schema.Alias.length > 0 ? schema.Alias : undefined;
}

/**
 * Index the namespaces, complex types and enumeration types of all schemas.
 *
 * @param schemas - Schema nodes in document order.
 * @returns The type index.
 */
function indexSchemaTypes(schemas: ReadonlyArray<XmlRecord>): SchemaTypeIndex {
    const namespaceAliases = new Map<string, string>();
    const structuredTypes = new Set<string>();
    const enumMembers = new Map<string, ReadonlyArray<string>>();
    for (const schema of schemas) {
        const namespace = requiredString(schema.Namespace, 'schema namespace');
        const alias = schemaAlias(schema);
        namespaceAliases.set(namespace, namespace);
        if (alias) {
            namespaceAliases.set(alias, namespace);
        }
        for (const complexType of asArray(schema.ComplexType)) {
            const name = requiredString(complexType.Name, 'complex type name');
            structuredTypes.add(`${namespace}.${name}`);
            if (alias) {
                structuredTypes.add(`${alias}.${name}`);
            }
        }
        collectEnumMembers(schema, namespace, alias, enumMembers);
    }
    return { namespaceAliases, structuredTypes, enumMembers };
}

/**
 * Write a qualified type name with its namespace instead of an alias.
 *
 * @param qualifiedType - Namespace- or alias-qualified type name.
 * @param namespaceAliases - Namespace or alias to the namespace it names.
 * @returns The namespace-qualified name, or the input when it is not qualified.
 */
function canonicalQualifiedType(qualifiedType: string, namespaceAliases: ReadonlyMap<string, string>): string {
    const separator = qualifiedType.lastIndexOf('.');
    if (separator <= 0 || separator === qualifiedType.length - 1) {
        return qualifiedType;
    }
    const qualifier = qualifiedType.slice(0, separator);
    const localName = qualifiedType.slice(separator + 1);
    return `${namespaceAliases.get(qualifier) ?? qualifier}.${localName}`;
}

/**
 * Group the annotations of external `Annotations` targets that address a type member.
 *
 * @param schemas - Schema nodes in document order.
 * @param namespaceAliases - Namespace or alias to the namespace it names.
 * @returns Annotation nodes by canonical `Type/Member` target, in document order.
 */
function collectExternalAnnotations(
    schemas: ReadonlyArray<XmlRecord>,
    namespaceAliases: ReadonlyMap<string, string>
): Map<string, XmlRecord[]> {
    const externalAnnotationNodes = new Map<string, XmlRecord[]>();
    for (const schema of schemas) {
        for (const group of asArray(schema.Annotations)) {
            const target = requiredString(group.Target, 'annotation target');
            const pathSeparator = target.indexOf('/');
            if (pathSeparator < 1 || pathSeparator === target.length - 1) {
                continue;
            }
            const canonicalTarget = `${canonicalQualifiedType(
                target.slice(0, pathSeparator),
                namespaceAliases
            )}${target.slice(pathSeparator)}`;
            const existing = externalAnnotationNodes.get(canonicalTarget) ?? [];
            externalAnnotationNodes.set(canonicalTarget, [...existing, ...asArray(group.Annotation)]);
        }
    }
    return externalAnnotationNodes;
}

/**
 * Group the annotations of external `Annotations` targets that address a whole type.
 *
 * @param schemas - Schema nodes in document order.
 * @param namespaceAliases - Namespace or alias to the namespace it names.
 * @returns Annotation nodes by canonical type name, in document order.
 */
function collectTypeAnnotations(
    schemas: ReadonlyArray<XmlRecord>,
    namespaceAliases: ReadonlyMap<string, string>
): Map<string, XmlRecord[]> {
    const typeAnnotationNodes = new Map<string, XmlRecord[]>();
    for (const schema of schemas) {
        for (const group of asArray(schema.Annotations)) {
            const target = requiredString(group.Target, 'annotation target');
            if (target.includes('/') || target.includes('(')) {
                continue;
            }
            const canonicalTarget = canonicalQualifiedType(target, namespaceAliases);
            const existing = typeAnnotationNodes.get(canonicalTarget) ?? [];
            typeAnnotationNodes.set(canonicalTarget, [...existing, ...asArray(group.Annotation)]);
        }
    }
    return typeAnnotationNodes;
}

/**
 * The semantic key an entity type hierarchy declares (`Common.SemanticKey`), inline or through an external
 * target, kept only when it names declared scalar properties.
 *
 * @param context - The parsed document.
 * @param hierarchy - The entity type and its base types.
 * @param properties - The entity's scalar properties by name.
 * @returns The property names of the semantic key, or undefined when none is declared
 */
function semanticKeyOf(
    context: EdmxParseContext,
    hierarchy: ReadonlyArray<ResolvedEntityType>,
    properties: ReadonlyMap<string, SchemaProperty>
): string[] | undefined {
    for (const { entityType, qualifiedType } of hierarchy) {
        const nodes = [...asArray(entityType.Annotation), ...(context.typeAnnotationNodes.get(qualifiedType) ?? [])];
        const annotation = nodes.find(
            (node) =>
                typeof node.Term === 'string' && node.Term.toLowerCase().endsWith(VOCABULARY_TERM_SUFFIX.semanticKey)
        );
        const collection = annotation && isRecord(annotation.Collection) ? annotation.Collection : undefined;
        const names = asArrayOfStrings(collection?.PropertyPath);
        if (names.length > 0 && names.every((name) => properties.has(name))) {
            return names;
        }
    }
    return undefined;
}

/**
 * The alternate keys an entity type hierarchy declares (`Core.AlternateKeys`), inline or through an external
 * target: each key's property paths, kept only when every path names a declared scalar property.
 *
 * @param context - The parsed document.
 * @param hierarchy - The entity type and its base types.
 * @param properties - The entity's scalar properties by name.
 * @returns The property names of each alternate key, or undefined when none is declared
 */
function alternateKeysOf(
    context: EdmxParseContext,
    hierarchy: ReadonlyArray<ResolvedEntityType>,
    properties: ReadonlyMap<string, SchemaProperty>
): string[][] | undefined {
    const keys = hierarchy.flatMap(({ entityType, qualifiedType }) =>
        [...asArray(entityType.Annotation), ...(context.typeAnnotationNodes.get(qualifiedType) ?? [])]
            .filter(
                (node) =>
                    typeof node.Term === 'string' &&
                    node.Term.toLowerCase().endsWith(VOCABULARY_TERM_SUFFIX.alternateKeys)
            )
            .flatMap((annotation) =>
                asArray(isRecord(annotation.Collection) ? annotation.Collection.Record : undefined)
            )
            .map((record) => {
                const key = asArray(record.PropertyValue).find((propertyValue) => propertyValue.Property === 'Key');
                return asArray(isRecord(key?.Collection) ? key.Collection.Record : undefined).map(
                    (part) =>
                        asArray(part.PropertyValue).find((propertyValue) => propertyValue.Property === 'Name')?.Path
                );
            })
            .filter(
                (names): names is string[] =>
                    names.length > 0 && names.every((name) => typeof name === 'string' && properties.has(name))
            )
    );
    return keys.length > 0 ? keys : undefined;
}

/**
 * Parse the complex types of all schemas.
 *
 * @param schemas - Schema nodes in document order.
 * @param types - The type index of the document.
 * @param externalAnnotationNodes - Annotations by canonical `Type/Property` target.
 * @returns The complex types in document order.
 */
function parseComplexTypes(
    schemas: ReadonlyArray<XmlRecord>,
    types: SchemaTypeIndex,
    externalAnnotationNodes: ReadonlyMap<string, ReadonlyArray<XmlRecord>>
): SchemaComplexType[] {
    const { structuredTypes, enumMembers } = types;
    const complexTypes: SchemaComplexType[] = [];
    for (const schema of schemas) {
        const namespace = requiredString(schema.Namespace, 'schema namespace');
        for (const complexType of asArray(schema.ComplexType)) {
            const name = requiredString(complexType.Name, 'complex type name');
            const qualifiedName = `${namespace}.${name}`;
            const properties: SchemaProperty[] = [];
            const structuredProperties: SchemaStructuredProperty[] = [];
            for (const property of asArray(complexType.Property)) {
                const propertyName = requiredString(property.Name, 'property name');
                const annotationsForProperty = externalAnnotationNodes.get(`${qualifiedName}/${propertyName}`) ?? [];
                const parsed = parseProperty(property, new Set(), structuredTypes, enumMembers, annotationsForProperty);
                if (parsed.kind === 'scalar') {
                    properties.push(parsed.property);
                } else if (parsed.kind === 'structured') {
                    const structured = parseStructuredProperty(property, structuredTypes, annotationsForProperty);
                    if (structured) {
                        structuredProperties.push(structured);
                    }
                }
            }
            complexTypes.push({ name, qualifiedName, properties, structuredProperties });
        }
    }
    return complexTypes;
}

/**
 * Index the entity types of all schemas under namespace- and alias-qualified names.
 *
 * @param schemas - Schema nodes in document order.
 * @returns Entity types by qualified name.
 */
function indexEntityTypes(schemas: ReadonlyArray<XmlRecord>): Map<string, ResolvedEntityType> {
    const entityTypes = new Map<string, ResolvedEntityType>();
    for (const schema of schemas) {
        const namespace = requiredString(schema.Namespace, 'schema namespace');
        const alias = schemaAlias(schema);
        for (const entityType of asArray(schema.EntityType)) {
            const name = requiredString(entityType.Name, 'entity type name');
            const resolved = { qualifiedType: `${namespace}.${name}`, schema, entityType };
            entityTypes.set(resolved.qualifiedType, resolved);
            if (alias) {
                entityTypes.set(`${alias}.${name}`, resolved);
            }
        }
    }
    return entityTypes;
}

/**
 * Resolve an entity type and its base types, root first.
 *
 * @param entityTypes - Entity types by qualified name.
 * @param qualifiedType - Namespace- or alias-qualified entity type name.
 * @param visiting - Types already on the inheritance path, to detect cycles.
 * @returns The hierarchy, or the reason it cannot be resolved within this document.
 */
function entityTypeHierarchy(
    entityTypes: ReadonlyMap<string, ResolvedEntityType>,
    qualifiedType: string,
    visiting: ReadonlySet<string> = new Set()
): ResolvedEntityType[] | string {
    const resolved = entityTypes.get(qualifiedType);
    if (!resolved) {
        return `entity type ${qualifiedType} is not declared in the metadata document`;
    }
    if (visiting.has(resolved.qualifiedType)) {
        return `entity inheritance contains a cycle at ${resolved.qualifiedType}`;
    }
    if (typeof resolved.entityType.BaseType !== 'string') {
        return [resolved];
    }
    const base = entityTypeHierarchy(
        entityTypes,
        resolved.entityType.BaseType,
        new Set([...visiting, resolved.qualifiedType])
    );
    return typeof base === 'string' ? base : [...base, resolved];
}

/**
 * The entity sets a container declares as currency or unit-of-measure code lists of this service.
 *
 * @param schemas - Schema nodes in document order.
 * @param schema - The schema that declares the container.
 * @param container - The entity container node.
 * @returns Code-list kind by entity set name.
 */
function containerCodeLists(
    schemas: ReadonlyArray<XmlRecord>,
    schema: XmlRecord,
    container: XmlRecord
): Map<string, 'currency' | 'unit'> {
    const containerName = `${requiredString(schema.Namespace, 'schema namespace')}.${requiredString(
        container.Name,
        'container name'
    )}`;
    const containerAnnotations = [
        ...asArray(container.Annotation),
        ...schemas.flatMap((candidate) =>
            asArray(candidate.Annotations)
                .filter((group) => group.Target === containerName)
                .flatMap((group) => asArray(group.Annotation))
        )
    ];
    const codeLists = new Map<string, 'currency' | 'unit'>();
    for (const annotation of containerAnnotations) {
        const term = String(annotation.Term).toLowerCase();
        let kind: 'currency' | 'unit' | undefined;
        if (term.endsWith(VOCABULARY_TERM_SUFFIX.currencyCodes)) {
            kind = 'currency';
        } else if (term.endsWith(VOCABULARY_TERM_SUFFIX.unitsOfMeasure)) {
            kind = 'unit';
        }
        const values = asArray(asArray(annotation.Record)[0]?.PropertyValue);
        const url = values.find((value) => value.Property === 'Url')?.String;
        const collection = values.find((value) => value.Property === 'CollectionPath')?.String;
        if (
            kind &&
            typeof collection === 'string' &&
            (url === undefined || url === './$metadata' || url === '$metadata')
        ) {
            codeLists.set(collection, kind);
        }
    }
    return codeLists;
}

/**
 * The key property names an entity type hierarchy declares. A blank key reference names no property,
 * so it contributes no key value.
 *
 * @param hierarchy - The entity type and its base types, root first.
 * @returns The key property names.
 */
function hierarchyKeyNames(hierarchy: ReadonlyArray<ResolvedEntityType>): Set<string> {
    return new Set(
        hierarchy.flatMap(({ entityType }) =>
            asArray(isRecord(entityType.Key) ? entityType.Key.PropertyRef : undefined).flatMap((key) =>
                typeof key.Name === 'string' && key.Name.length > 0 ? [key.Name] : []
            )
        )
    );
}

/**
 * Parse the properties of an entity type hierarchy; a derived type's property replaces a base property
 * of the same name.
 *
 * @param context - The parsed document.
 * @param hierarchy - The entity type and its base types, root first.
 * @param keyNames - The key property names.
 * @returns Scalar, structured and omitted properties by name, in declaration order.
 */
function hierarchyProperties(
    context: EdmxParseContext,
    hierarchy: ReadonlyArray<ResolvedEntityType>,
    keyNames: ReadonlySet<string>
): {
    properties: Map<string, SchemaProperty>;
    structuredProperties: Map<string, SchemaStructuredProperty>;
    omittedProperties: Map<string, SchemaOmittedProperty>;
} {
    const { structuredTypes, enumMembers, externalAnnotationNodes } = context;
    const properties = new Map<string, SchemaProperty>();
    const structuredProperties = new Map<string, SchemaStructuredProperty>();
    const omittedProperties = new Map<string, SchemaOmittedProperty>();
    for (const { entityType, qualifiedType: hierarchyType } of hierarchy) {
        for (const property of asArray(entityType.Property)) {
            const propertyName = requiredString(property.Name, 'property name');
            const annotationsForProperty = externalAnnotationNodes.get(`${hierarchyType}/${propertyName}`) ?? [];
            const parsed = parseProperty(property, keyNames, structuredTypes, enumMembers, annotationsForProperty);
            if (parsed.kind === 'scalar') {
                properties.set(parsed.property.name, parsed.property);
            } else if (parsed.kind === 'omitted') {
                omittedProperties.set(parsed.property.name, parsed.property);
            } else {
                const structured = parseStructuredProperty(property, structuredTypes, annotationsForProperty);
                if (structured) {
                    structuredProperties.set(structured.name, structured);
                }
            }
        }
    }
    return { properties, structuredProperties, omittedProperties };
}

/**
 * Link each amount to its unit property as its currency when that unit is annotated as a currency code.
 *
 * @param properties - Scalar properties by name.
 * @returns The properties in declaration order, with the currency links added.
 */
function withCurrencyLinks(properties: ReadonlyMap<string, SchemaProperty>): SchemaProperty[] {
    return [...properties.values()].map((property) => {
        const unit = property.links?.unit ? properties.get(property.links.unit) : undefined;
        const currency = unit?.annotations.some(
            ({ term, value }) =>
                (term === SAP_V2_TERM.semantics && value === SAP_V2_SEMANTICS_CURRENCY_CODE) ||
                (term.toLowerCase().endsWith(VOCABULARY_TERM_SUFFIX.isCurrency) && value !== false)
        );
        return currency && !property.links?.currency
            ? { ...property, links: { ...property.links, currency: unit?.name } }
            : property;
    });
}

/**
 * Parse one entity set or singleton into the collection, or record why it is skipped. An entity set
 * whose rows cannot be generated is skipped on its own; the rest of the service is still generated,
 * and the caller receives a diagnostic for a skipped target.
 *
 * @param context - The parsed document.
 * @param entitySet - The entity set or singleton node.
 * @param typeAttribute - The attribute that names its entity type.
 * @param codeLists - Code-list kind by entity set name, from its container.
 * @param collection - Receives the entity set or the reason it is skipped.
 * @param containedBy - Where the rows live, for a contained entity.
 */
function collectEntitySet(
    context: EdmxParseContext,
    entitySet: XmlRecord,
    typeAttribute: string,
    codeLists: ReadonlyMap<string, 'currency' | 'unit'>,
    collection: EntitySetCollection,
    containedBy?: SchemaContainment
): void {
    const entitySetName = requiredString(entitySet.Name, 'entity set name');
    const qualifiedType = requiredString(entitySet[typeAttribute], `entity type for ${entitySetName}`);
    const resolved = context.entityTypes.get(qualifiedType);
    const hierarchy = entityTypeHierarchy(context.entityTypes, qualifiedType);
    if (!resolved || typeof hierarchy === 'string') {
        collection.skippedEntitySets.push({
            entitySetName,
            reason: typeof hierarchy === 'string' ? hierarchy : `entity type ${qualifiedType} is unresolved`,
            ...(containedBy ? { containedBy } : {})
        });
        return;
    }
    const keyNames = hierarchyKeyNames(hierarchy);
    const { properties, structuredProperties, omittedProperties } = hierarchyProperties(context, hierarchy, keyNames);
    const keyReason = ungeneratableKeyReason(keyNames, omittedProperties, structuredProperties);
    if (keyReason !== undefined) {
        collection.skippedEntitySets.push({
            entitySetName,
            reason: keyReason,
            ...(containedBy ? { containedBy } : {})
        });
        return;
    }
    const semanticKey = semanticKeyOf(context, hierarchy, properties);
    const alternateKeys = alternateKeysOf(context, hierarchy, properties);
    collection.entities.push({
        name: requiredString(resolved.entityType.Name, 'entity type name'),
        entitySetName,
        ...(containedBy ? { containedBy } : {}),
        ...(codeLists.has(entitySetName) ? { codeList: codeLists.get(entitySetName) } : {}),
        ...(semanticKey ? { semanticKey } : {}),
        ...(alternateKeys ? { alternateKeys } : {}),
        properties: withCurrencyLinks(properties),
        structuredProperties: [...structuredProperties.values()],
        ...(omittedProperties.size > 0 ? { omittedProperties: [...omittedProperties.values()] } : {})
    });
    const { entitySetByType } = collection;
    if (!entitySetByType.has(qualifiedType)) {
        entitySetByType.set(qualifiedType, entitySetName);
    }
    if (!entitySetByType.has(resolved.qualifiedType)) {
        entitySetByType.set(resolved.qualifiedType, entitySetName);
    }
    collection.entitySets.push({ entitySet, entitySetName, qualifiedType });
}

/**
 * Parse the entity sets and singletons of every entity container.
 *
 * @param context - The parsed document.
 * @returns The generatable and skipped entity sets.
 */
function collectEntitySets(context: EdmxParseContext): EntitySetCollection {
    const collection: EntitySetCollection = {
        entities: [],
        skippedEntitySets: [],
        entitySetByType: new Map(),
        entitySets: [],
        containedNavigations: new Set()
    };
    for (const schema of context.schemas) {
        for (const container of asArray(schema.EntityContainer)) {
            const codeLists = containerCodeLists(context.schemas, schema, container);
            const resources = [
                ...asArray(container.EntitySet).map((resource) => ({ resource, typeAttribute: 'EntityType' })),
                ...asArray(container.Singleton).map((resource) => ({ resource, typeAttribute: 'Type' }))
            ];
            for (const { resource, typeAttribute } of resources) {
                collectEntitySet(context, resource, typeAttribute, codeLists, collection);
            }
        }
    }
    collectContainedEntities(context, collection);
    return collection;
}

/**
 * The target type of a containment navigation whose target type has no entity set.
 *
 * @param context - The parsed document.
 * @param navigation - The navigation property node.
 * @param setTypes - Declared and canonical names of the entity types that have an entity set.
 * @returns The declared target type, or undefined for any other navigation
 */
function containedTargetType(
    context: EdmxParseContext,
    navigation: XmlRecord,
    setTypes: ReadonlySet<string>
): string | undefined {
    const targetType = entityTypeName(navigation.Type);
    const canonicalType = targetType ? context.entityTypes.get(targetType)?.qualifiedType : undefined;
    const contains = navigation.ContainsTarget === true || navigation.ContainsTarget === 'true';
    return contains &&
        targetType !== undefined &&
        !setTypes.has(targetType) &&
        !setTypes.has(canonicalType ?? targetType)
        ? targetType
        : undefined;
}

/**
 * Parse the entity types that only other rows contain (OData `ContainsTarget` to a type without an entity set)
 * as entities named by their containment path, depth after depth. A type the path already contains is not
 * contained again, so recursive containment ends; the navigations the draft framework adds are not
 * containment of business data. Each contained entity reads the navigation bindings its container declares
 * below the containment navigation.
 *
 * @param context - The parsed document.
 * @param collection - The entity sets; receives the contained entities and the containment navigations.
 */
function collectContainedEntities(context: EdmxParseContext, collection: EntitySetCollection): void {
    const setTypes = new Set(collection.entitySetByType.keys());
    const pathTypes = new Map(
        collection.entitySets.map(({ entitySetName, qualifiedType }) => [
            entitySetName,
            new Set([context.entityTypes.get(qualifiedType)?.qualifiedType ?? qualifiedType])
        ])
    );
    for (let index = 0; index < collection.entitySets.length; index++) {
        const { entitySet, entitySetName, qualifiedType } = collection.entitySets[index];
        const hierarchy = entityTypeHierarchy(context.entityTypes, qualifiedType);
        const containing = pathTypes.get(entitySetName) ?? new Set<string>();
        const navigations =
            typeof hierarchy === 'string'
                ? []
                : hierarchy.flatMap(({ entityType }) => asArray(entityType.NavigationProperty));
        for (const navigation of navigations) {
            const name = requiredString(navigation.Name, 'navigation property name');
            const targetType = containedTargetType(context, navigation, setTypes);
            if (targetType === undefined) {
                continue;
            }
            collection.containedNavigations.add(`${entitySetName}/${name}`);
            const canonicalType = context.entityTypes.get(targetType)?.qualifiedType ?? targetType;
            if (DRAFT_NAVIGATION_NAMES.has(name.toLowerCase()) || containing.has(canonicalType)) {
                continue;
            }
            const containedName = `${entitySetName}/${name}`;
            const prefix = `${name}/`;
            const bindings = asArray(entitySet.NavigationPropertyBinding)
                .filter((binding) => typeof binding.Path === 'string' && binding.Path.startsWith(prefix))
                .map((binding) => ({ ...binding, Path: String(binding.Path).slice(prefix.length) }));
            pathTypes.set(containedName, new Set([...containing, canonicalType]));
            collectEntitySet(
                context,
                { Name: containedName, EntityType: targetType, NavigationPropertyBinding: bindings },
                'EntityType',
                new Map(),
                collection,
                { entitySetName, navigation: name, isCollection: navigationTargetCardinality(navigation) === 'many' }
            );
        }
    }
}

/**
 * Index the OData V2 associations of all schemas by namespace-qualified name.
 *
 * @param schemas - Schema nodes in document order.
 * @returns Association nodes by qualified name.
 */
function indexAssociations(schemas: ReadonlyArray<XmlRecord>): Map<string, XmlRecord> {
    const associations = new Map<string, XmlRecord>();
    for (const schema of schemas) {
        const namespace = requiredString(schema.Namespace, 'schema namespace');
        for (const association of asArray(schema.Association)) {
            associations.set(`${namespace}.${requiredString(association.Name, 'association name')}`, association);
        }
    }
    return associations;
}

/**
 * The relationship of an OData V4 navigation that declares referential constraints.
 *
 * @param source - The navigation and its entity set.
 * @param constraints - The referential constraint nodes.
 * @param entitySetByType - Entity type name to the first entity set of that type.
 * @returns The explicit relationship, or undefined when the target entity set is unknown.
 */
function constrainedNavigationRelationship(
    source: NavigationSource,
    constraints: ReadonlyArray<XmlRecord>,
    entitySetByType: ReadonlyMap<string, string>
): SchemaRelationship | undefined {
    const { navigation, name, entitySetName, bindings, navigationDetails } = source;
    const targetType = entityTypeName(navigation.Type);
    const targetEntitySet = bindings.get(name) ?? (targetType ? entitySetByType.get(targetType) : undefined);
    if (!targetEntitySet) {
        return undefined;
    }
    return {
        name,
        fromEntitySet: entitySetName,
        toEntitySet: targetEntitySet,
        mappings: constraints.map((constraint) => ({
            sourceProperty: requiredString(constraint.Property, `source property for ${name}`),
            targetProperty: requiredString(constraint.ReferencedProperty, `target property for ${name}`)
        })),
        provenance: 'explicit',
        confidence: 1,
        ...navigationDetails
    };
}

/**
 * The relationship of a navigation without referential constraints, inferred from the target's business keys
 * when the source declares properties of the same names and types, as the SAP Fiori elements mockserver
 * matches such a navigation. A to-many navigation whose target has further keys lists the target rows that
 * share the matched key values with the source row. When those values are the source's complete key, the
 * target rows reference the source through them; otherwise the source takes them from a target row, so every
 * source row lists one. When the source declares none of the target keys, the target rows reference the
 * source through the source keys the target declares. Draft navigations are never inferred.
 *
 * @param source - The navigation and its entity set.
 * @param context - The parsed document.
 * @param entitySets - The generatable entity sets.
 * @param entitiesBySet - Generatable entities by entity set name.
 * @returns The inferred relationship, or undefined when no key of the target is matched.
 */
function inferredNavigationRelationship(
    source: NavigationSource,
    context: EdmxParseContext,
    entitySets: ReadonlyArray<DeclaredEntitySet>,
    entitiesBySet: ReadonlyMap<string, SchemaEntity>
): NavigationRelationship | undefined {
    const { name, entitySetName, bindings, navigationDetails, targetType } = source;
    const { entityTypes } = context;
    const canonicalTargetType = targetType ? entityTypes.get(targetType)?.qualifiedType : undefined;
    const matchingTargetSets = canonicalTargetType
        ? entitySets.filter(
              (candidate) => entityTypes.get(candidate.qualifiedType)?.qualifiedType === canonicalTargetType
          )
        : [];
    const boundTarget = bindings.get(name);
    const targetEntitySet =
        boundTarget ?? (matchingTargetSets.length === 1 ? matchingTargetSets[0].entitySetName : undefined);
    const sourceEntity = entitiesBySet.get(entitySetName);
    const targetEntity = targetEntitySet ? entitiesBySet.get(targetEntitySet) : undefined;
    const targetKeys = sharedKeyNames(targetEntity, sourceEntity);
    const isDraftNavigation =
        DRAFT_NAVIGATION_NAMES.has(name.toLowerCase()) ||
        canonicalTargetType?.toLowerCase().includes(DRAFT_ADMINISTRATIVE_DATA_TYPE) === true;
    if (!targetEntitySet || targetKeys.declared === 0 || isDraftNavigation) {
        return undefined;
    }
    const sameNamed = (names: readonly string[]): SchemaRelationship['mappings'] =>
        names.map((key) => ({ sourceProperty: key, targetProperty: key }));
    const toMany = navigationDetails.targetCardinality === 'many';
    const sourceKeys = sharedKeyNames(sourceEntity, targetEntity);
    // Target keys that are the source's complete key are the source row's identity: the target rows
    // reference the source through them.
    const sourceIdentified =
        targetKeys.shared.length === sourceKeys.declared && namesBusinessKey(sourceEntity, targetKeys.shared);
    if (
        targetKeys.shared.length > 0 &&
        (targetKeys.shared.length === targetKeys.declared || (toMany && !sourceIdentified))
    ) {
        return {
            relationship: {
                name,
                fromEntitySet: entitySetName,
                toEntitySet: targetEntitySet,
                mappings: sameNamed(targetKeys.shared),
                provenance: 'inferred',
                confidence: 0.8,
                ...navigationDetails
            },
            fromTarget: false
        };
    }
    // The mockserver lists the target rows that share the source row's values of the target keys the source
    // declares, or, when it declares none, of the source keys the target declares.
    const childKeys = targetKeys.shared.length > 0 ? targetKeys.shared : sourceKeys.shared;
    if (!toMany || childKeys.length === 0) {
        return undefined;
    }
    return {
        relationship: {
            name,
            fromEntitySet: targetEntitySet,
            toEntitySet: entitySetName,
            mappings: sameNamed(childKeys),
            provenance: 'inferred',
            confidence: 0.8,
            targetCardinality: 'one'
        },
        fromTarget: true
    };
}

/**
 * The business keys of an entity, draft keys left out, that another entity declares as properties of the
 * same names and types.
 *
 * @param keyed - The entity whose keys are matched.
 * @param other - The entity that may declare them.
 * @returns How many business keys the entity has, and the names of those the other entity declares.
 */
function sharedKeyNames(
    keyed: SchemaEntity | undefined,
    other: SchemaEntity | undefined
): { declared: number; shared: string[] } {
    const keys =
        keyed?.properties.filter(
            (property) => property.isKey && !DRAFT_KEY_PROPERTY_NAMES.has(property.name.toLowerCase())
        ) ?? [];
    const otherProperties = new Map(other?.properties.map((property) => [property.name, property]));
    return {
        declared: keys.length,
        shared: keys
            .filter((key) => otherProperties.get(key.name)?.primitiveType === key.primitiveType)
            .map((key) => key.name)
    };
}

/**
 * Whether properties are the complete business key of an entity, draft keys left out.
 *
 * @param entity - The entity.
 * @param names - The property names.
 * @returns true when the names are exactly the entity's business keys
 */
function namesBusinessKey(entity: SchemaEntity | undefined, names: readonly string[]): boolean {
    const keys = sharedKeyNames(entity, entity);
    return keys.declared > 0 && keys.declared === names.length && keys.shared.every((key) => names.includes(key));
}

/**
 * The relationship of an OData V2 navigation whose association declares a referential constraint: the
 * dependent's properties reference the principal's, whichever end the navigation starts from. A constraint
 * read from the principal's navigation whose principal properties are not the principal's key, while the
 * dependent's are the dependent's key, cannot select one principal row: the principal references the
 * dependent through them instead, the way a key is referenced.
 *
 * @param source - The navigation and its entity set.
 * @param relationshipName - The qualified association name.
 * @param associations - Association nodes by qualified name.
 * @param entitySetByType - Entity type name to the first entity set of that type.
 * @param entitiesBySet - Generatable entities by entity set name.
 * @returns The explicit relationship, or undefined when the association does not constrain the navigation.
 */
function associationRelationship(
    source: NavigationSource,
    relationshipName: string,
    associations: ReadonlyMap<string, XmlRecord>,
    entitySetByType: ReadonlyMap<string, string>,
    entitiesBySet: ReadonlyMap<string, SchemaEntity>
): NavigationRelationship | undefined {
    const { navigation, name, entitySetName } = source;
    const association = associations.get(relationshipName);
    const constraint =
        association && isRecord(association.ReferentialConstraint) ? association.ReferentialConstraint : undefined;
    if (!association || !constraint || !isRecord(constraint.Principal) || !isRecord(constraint.Dependent)) {
        return undefined;
    }
    const sourceRole = typeof navigation.FromRole === 'string' ? navigation.FromRole : undefined;
    const targetRole = typeof navigation.ToRole === 'string' ? navigation.ToRole : undefined;
    const principalRole = requiredString(constraint.Principal.Role, `principal role for ${name}`);
    const dependentRole = requiredString(constraint.Dependent.Role, `dependent role for ${name}`);
    const fromDependent = sourceRole === dependentRole && targetRole === principalRole;
    if (!fromDependent && (sourceRole !== principalRole || targetRole !== dependentRole)) {
        return undefined;
    }
    const targetEnd = asArray(association.End).find((end) => end.Role === targetRole);
    const targetType = targetEnd ? entityTypeName(targetEnd.Type) : undefined;
    const targetEntitySet = targetType ? entitySetByType.get(targetType) : undefined;
    if (!targetEntitySet) {
        return undefined;
    }
    const sourceProperties = propertyRefs(constraint.Dependent.PropertyRef);
    const targetProperties = propertyRefs(constraint.Principal.PropertyRef);
    if (sourceProperties.length !== targetProperties.length || sourceProperties.length === 0) {
        return undefined;
    }
    const mappings = sourceProperties.map((sourceProperty, index) => ({
        sourceProperty,
        targetProperty: targetProperties[index]
    }));
    if (
        !fromDependent &&
        !namesBusinessKey(entitiesBySet.get(entitySetName), targetProperties) &&
        namesBusinessKey(entitiesBySet.get(targetEntitySet), sourceProperties)
    ) {
        return {
            relationship: {
                name,
                fromEntitySet: entitySetName,
                toEntitySet: targetEntitySet,
                mappings: mappings.map(({ sourceProperty, targetProperty }) => ({
                    sourceProperty: targetProperty,
                    targetProperty: sourceProperty
                })),
                provenance: 'explicit',
                confidence: 1,
                targetCardinality: 'one'
            },
            fromTarget: false
        };
    }
    if (!fromDependent) {
        // The navigation starts from the principal: its target rows are the dependents that reference it.
        const sourceEnd = asArray(association.End).find((end) => end.Role === sourceRole);
        return {
            relationship: {
                name,
                fromEntitySet: targetEntitySet,
                toEntitySet: entitySetName,
                mappings,
                provenance: 'explicit',
                confidence: 1,
                targetCardinality: associationTargetCardinality(sourceEnd?.Multiplicity)
            },
            fromTarget: true
        };
    }
    return {
        relationship: {
            name,
            fromEntitySet: entitySetName,
            toEntitySet: targetEntitySet,
            mappings,
            provenance: 'explicit',
            confidence: 1,
            targetCardinality: associationTargetCardinality(targetEnd?.Multiplicity)
        },
        fromTarget: false
    };
}

/**
 * The end of an OData V2 navigation's association that the navigation leads to.
 *
 * @param navigation - The navigation property node.
 * @param associations - Association nodes by qualified name.
 * @returns The association and the target end, or undefined for a navigation without an association.
 */
function associationTarget(
    navigation: XmlRecord,
    associations: ReadonlyMap<string, XmlRecord>
): { association: XmlRecord; targetEnd: XmlRecord | undefined } | undefined {
    const association =
        typeof navigation.Relationship === 'string' ? associations.get(navigation.Relationship) : undefined;
    return association
        ? { association, targetEnd: asArray(association.End).find((end) => end.Role === navigation.ToRole) }
        : undefined;
}

/**
 * The relationship of one navigation: its referential constraint, its association's, or one inferred from
 * the keys its ends declare when neither declares a constraint.
 *
 * @param source - The navigation and its entity set.
 * @param target - The navigation's association and target end, for an OData V2 navigation.
 * @param context - The parsed document.
 * @param collection - The generatable entity sets.
 * @param indexes - Association nodes by qualified name, and generatable entities by entity set name.
 * @param indexes.associations - Association nodes by qualified name.
 * @param indexes.entitiesBySet - Generatable entities by entity set name.
 * @returns The relationship, or undefined when the navigation links no properties.
 */
function navigationRelationship(
    source: NavigationSource,
    target: ReturnType<typeof associationTarget>,
    context: EdmxParseContext,
    collection: EntitySetCollection,
    indexes: {
        associations: ReadonlyMap<string, XmlRecord>;
        entitiesBySet: ReadonlyMap<string, SchemaEntity>;
    }
): NavigationRelationship | undefined {
    const { navigation } = source;
    const { associations, entitiesBySet } = indexes;
    const { entitySetByType, entitySets } = collection;
    const v4Constraints = asArray(navigation.ReferentialConstraint);
    if (v4Constraints.length > 0) {
        const constrained = constrainedNavigationRelationship(source, v4Constraints, entitySetByType);
        return constrained ? { relationship: constrained, fromTarget: false } : undefined;
    }
    if (typeof navigation.Relationship === 'string') {
        if (!target) {
            return undefined;
        }
        if (target.association.ReferentialConstraint) {
            return associationRelationship(
                source,
                navigation.Relationship,
                associations,
                entitySetByType,
                entitiesBySet
            );
        }
    }
    return inferredNavigationRelationship(source, context, entitySets, entitiesBySet);
}

/**
 * Read the relationships of every navigation property of the generatable entity sets, in document order.
 * A navigation without a referential constraint is resolved as the SAP Fiori elements mockserver resolves
 * it: through the reference its target declares back to its source when there is one, so no key mapping is
 * inferred for it, and otherwise through the keys both declare by name. Children inferred to reference their
 * parent keep only a reference the children do not declare or infer themselves.
 *
 * @param context - The parsed document.
 * @param collection - The generatable entity sets.
 * @returns The relationships, before filtering to generatable ones.
 */
function collectRelationships(context: EdmxParseContext, collection: EntitySetCollection): SchemaRelationship[] {
    const associations = indexAssociations(context.schemas);
    const resolved: NavigationRelationship[] = [];
    const entitiesBySet = new Map(collection.entities.map((entity) => [entity.entitySetName, entity]));
    for (const { entitySet, entitySetName, qualifiedType } of collection.entitySets) {
        const hierarchy = entityTypeHierarchy(context.entityTypes, qualifiedType);
        const sourceTypes = typeof hierarchy === 'string' ? [] : hierarchy.map(({ entityType }) => entityType);
        const bindings = new Map(
            asArray(entitySet.NavigationPropertyBinding).map((binding) => [
                requiredString(binding.Path, 'navigation binding path').split('/')[0],
                unqualifiedName(requiredString(binding.Target, 'navigation binding target'))
            ])
        );
        // A contained row lives in its container's row, so no key mapping links them.
        const navigations = sourceTypes
            .flatMap((sourceType) => asArray(sourceType.NavigationProperty))
            .filter(({ Name }) => !collection.containedNavigations.has(`${entitySetName}/${String(Name)}`));
        for (const navigation of navigations) {
            const name = requiredString(navigation.Name, 'navigation property name');
            const target = associationTarget(navigation, associations);
            const targetCardinality = target
                ? associationTargetCardinality(target.targetEnd?.Multiplicity)
                : navigationTargetCardinality(navigation);
            const source: NavigationSource = {
                navigation,
                name,
                entitySetName,
                bindings,
                navigationDetails: {
                    ...(targetCardinality ? { targetCardinality } : {}),
                    ...(navigation.ContainsTarget === true || navigation.ContainsTarget === 'true'
                        ? { containsTarget: true }
                        : {}),
                    ...(typeof navigation.Partner === 'string' ? { partner: navigation.Partner } : {})
                },
                targetType: entityTypeName(target ? target.targetEnd?.Type : navigation.Type)
            };
            const relationship = navigationRelationship(source, target, context, collection, {
                associations,
                entitiesBySet
            });
            if (relationship) {
                resolved.push(relationship);
            }
        }
    }
    const typeOf = new Map(
        collection.entitySets.map(({ entitySetName, qualifiedType }) => [
            entitySetName,
            context.entityTypes.get(qualifiedType)?.qualifiedType ?? qualifiedType
        ])
    );
    const placed = resolved.map((entry) => ({ ...entry, relationship: withinContainers(entry.relationship, typeOf) }));
    const relationships = placed.map(({ relationship }) => relationship);
    return placed
        .filter(
            (entry, index) =>
                !declaredBackwards(entry, relationships) &&
                !redundant(entry, index, placed) &&
                !outranked(entry.relationship, relationships)
        )
        .map(({ relationship }) => relationship);
}

/**
 * Point a relationship between a contained row and a type its own path contains at that row's container of
 * the type. A type contained in several places is parsed once per containment path, and a navigation resolves
 * to the first; a contained row's reference back up its path names the row that holds it, in its own path.
 *
 * @param relationship - The resolved relationship.
 * @param typeOf - The canonical entity type of each entity set and contained entity, by name.
 * @returns The relationship, with each end that is a contained entity off the other end's path moved onto it.
 */
function withinContainers(relationship: SchemaRelationship, typeOf: ReadonlyMap<string, string>): SchemaRelationship {
    const ancestor = (name: string, of: string): string | undefined => {
        const type = typeOf.get(of);
        const parts = name.split('/');
        for (let length = parts.length - 1; length > 0; length--) {
            const path = parts.slice(0, length).join('/');
            if (typeOf.get(path) === type) {
                return path;
            }
        }
        return undefined;
    };
    const { fromEntitySet, toEntitySet } = relationship;
    const onPath = (name: string, other: string): boolean =>
        !other.includes('/') || name.startsWith(`${other}/`) || other.startsWith(`${name}/`) || name === other;
    if (onPath(fromEntitySet, toEntitySet)) {
        return relationship;
    }
    const target = ancestor(fromEntitySet, toEntitySet);
    if (target) {
        return { ...relationship, toEntitySet: target };
    }
    const source = ancestor(toEntitySet, fromEntitySet);
    return source ? { ...relationship, fromEntitySet: source } : relationship;
}

/**
 * Whether an inferred relationship links two entity sets whose reference the metadata already declares the
 * other way: the declared reference is how the navigation resolves, and the inferred key mapping would tie the
 * keys of both sets to each other. Target rows inferred to reference their source give way only to a declared
 * reference between the same properties, which already shares their values.
 *
 * @param entry - The relationship to check and its direction.
 * @param relationships - All relationships of the service.
 * @returns true for an inferred relationship with a declared reference in the opposite direction
 */
function declaredBackwards(entry: NavigationRelationship, relationships: readonly SchemaRelationship[]): boolean {
    const { relationship, fromTarget } = entry;
    const swapped = relationship.mappings.map(({ sourceProperty, targetProperty }) => ({
        sourceProperty: targetProperty,
        targetProperty: sourceProperty
    }));
    return (
        relationship.provenance === 'inferred' &&
        relationships.some(
            ({ provenance, fromEntitySet, toEntitySet, mappings }) =>
                provenance === 'explicit' &&
                fromEntitySet === relationship.toEntitySet &&
                toEntitySet === relationship.fromEntitySet &&
                (!fromTarget || JSON.stringify(mappings) === JSON.stringify(swapped))
        )
    );
}

/**
 * Whether an inferred relationship maps two or more properties that a declared reference of the same set maps
 * to another entity set, and that declared parent does not itself reference the inferred target through
 * them. A row then has to match a combination of values that rows of both parents hold, which their
 * independently generated rows rarely share; the declared reference decides those properties. A single
 * shared property is no conflict: the keys a foreign key points to are generated from one shared domain.
 *
 * @param relationship - The relationship to check.
 * @param relationships - All relationships of the service.
 * @returns true for an inferred relationship a declared one outranks
 */
function outranked(relationship: SchemaRelationship, relationships: readonly SchemaRelationship[]): boolean {
    if (relationship.provenance !== 'inferred') {
        return false;
    }
    return relationships.some((declared) => {
        if (
            declared.provenance !== 'explicit' ||
            declared.fromEntitySet !== relationship.fromEntitySet ||
            declared.toEntitySet === relationship.toEntitySet
        ) {
            return false;
        }
        const shared = relationship.mappings.flatMap(({ sourceProperty, targetProperty }) => {
            const declaredTarget = declared.mappings.find((mapping) => mapping.sourceProperty === sourceProperty);
            return declaredTarget ? [{ declaredProperty: declaredTarget.targetProperty, targetProperty }] : [];
        });
        const agreed = relationships.some(
            (link) =>
                link.fromEntitySet === declared.toEntitySet &&
                link.toEntitySet === relationship.toEntitySet &&
                shared.every(({ declaredProperty, targetProperty }) =>
                    link.mappings.some(
                        (mapping) =>
                            mapping.sourceProperty === declaredProperty && mapping.targetProperty === targetProperty
                    )
                )
        );
        return shared.length > 1 && !agreed;
    });
}

/**
 * Whether a relationship a navigation's target rows hold towards its source is already held another way:
 * an inferred one when the target rows reference the source through a navigation of their own, a declared
 * one when an earlier relationship declares the same reference.
 *
 * @param entry - The relationship to check and its direction.
 * @param index - Its position among the relationships.
 * @param resolved - All relationships of the service, in document order.
 * @returns true when the relationship adds no reference
 */
function redundant(entry: NavigationRelationship, index: number, resolved: readonly NavigationRelationship[]): boolean {
    const { relationship, fromTarget } = entry;
    if (!fromTarget) {
        return false;
    }
    const sameMappings = (other: SchemaRelationship): boolean =>
        JSON.stringify(other.mappings) === JSON.stringify(relationship.mappings);
    return resolved.some(
        (other, otherIndex) =>
            other !== entry &&
            other.relationship.fromEntitySet === relationship.fromEntitySet &&
            other.relationship.toEntitySet === relationship.toEntitySet &&
            (relationship.provenance === 'inferred'
                ? !other.fromTarget || otherIndex < index
                : sameMappings(other.relationship) && (!other.fromTarget || otherIndex < index))
    );
}

/**
 * Parse the host-provided, already-resolved EDMX into the generator's canonical graph.
 *
 * @param content - The EDMX document.
 * @returns The schema graph.
 * @throws {MockGenError} `METADATA_INVALID` when the document has no schema or a required name or type is missing
 */
export function parseEdmx(content: string): SchemaGraph {
    const schemas = readEdmxSchemas(content);
    const types = indexSchemaTypes(schemas);
    const externalAnnotationNodes = collectExternalAnnotations(schemas, types.namespaceAliases);
    const complexTypes = parseComplexTypes(schemas, types, externalAnnotationNodes);
    const context: EdmxParseContext = {
        schemas,
        structuredTypes: types.structuredTypes,
        enumMembers: types.enumMembers,
        externalAnnotationNodes,
        typeAnnotationNodes: collectTypeAnnotations(schemas, types.namespaceAliases),
        entityTypes: indexEntityTypes(schemas)
    };
    const collection = collectEntitySets(context);
    const { entities, skippedEntitySets } = collection;
    const relationships = collectRelationships(context, collection);

    return {
        namespace: requiredString(schemas[0].Namespace, 'schema namespace'),
        entities: entities.sort((left, right) => compareCodePoints(left.entitySetName, right.entitySetName)),
        relationships: generatableRelationships(entities, relationships).sort((left, right) =>
            compareCodePoints(`${left.fromEntitySet}.${left.name}`, `${right.fromEntitySet}.${right.name}`)
        ),
        complexTypes: complexTypes.sort((left, right) => compareCodePoints(left.qualifiedName, right.qualifiedName)),
        ...(skippedEntitySets.length > 0
            ? {
                  skippedEntitySets: skippedEntitySets.sort((left, right) =>
                      compareCodePoints(left.entitySetName, right.entitySetName)
                  )
              }
            : {})
    };
}
