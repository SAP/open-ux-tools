import { XMLParser } from 'fast-xml-parser';
import type {
    PrimitiveType,
    SchemaAnnotation,
    SchemaComplexType,
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
    /** Generatable entity sets with their container nodes, in document order. */
    entitySets: DeclaredEntitySet[];
}

/** One navigation property of an entity set, with what every kind of relationship reads from it. */
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
 */
function collectEntitySet(
    context: EdmxParseContext,
    entitySet: XmlRecord,
    typeAttribute: string,
    codeLists: ReadonlyMap<string, 'currency' | 'unit'>,
    collection: EntitySetCollection
): void {
    const entitySetName = requiredString(entitySet.Name, 'entity set name');
    const qualifiedType = requiredString(entitySet[typeAttribute], `entity type for ${entitySetName}`);
    const resolved = context.entityTypes.get(qualifiedType);
    const hierarchy = entityTypeHierarchy(context.entityTypes, qualifiedType);
    if (!resolved || typeof hierarchy === 'string') {
        collection.skippedEntitySets.push({
            entitySetName,
            reason: typeof hierarchy === 'string' ? hierarchy : `entity type ${qualifiedType} is unresolved`
        });
        return;
    }
    const keyNames = hierarchyKeyNames(hierarchy);
    const { properties, structuredProperties, omittedProperties } = hierarchyProperties(context, hierarchy, keyNames);
    const keyReason = ungeneratableKeyReason(keyNames, omittedProperties, structuredProperties);
    if (keyReason !== undefined) {
        collection.skippedEntitySets.push({ entitySetName, reason: keyReason });
        return;
    }
    collection.entities.push({
        name: requiredString(resolved.entityType.Name, 'entity type name'),
        entitySetName,
        ...(codeLists.has(entitySetName) ? { codeList: codeLists.get(entitySetName) } : {}),
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
        entitySets: []
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
    return collection;
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
 * The relationship of an OData V4 navigation without referential constraints, inferred from the target's
 * business keys when the source declares properties of the same names and types. Draft navigations are
 * never inferred.
 *
 * @param source - The navigation and its entity set.
 * @param context - The parsed document.
 * @param entitySets - The generatable entity sets.
 * @param entitiesBySet - Generatable entities by entity set name.
 * @returns The inferred relationship, or undefined when no key mapping is complete.
 */
function inferredNavigationRelationship(
    source: NavigationSource,
    context: EdmxParseContext,
    entitySets: ReadonlyArray<DeclaredEntitySet>,
    entitiesBySet: ReadonlyMap<string, SchemaEntity>
): SchemaRelationship | undefined {
    const { navigation, name, entitySetName, bindings, navigationDetails } = source;
    const { entityTypes } = context;
    const targetType = entityTypeName(navigation.Type);
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
    const businessKeys =
        targetEntity?.properties.filter(
            (property) => property.isKey && !DRAFT_KEY_PROPERTY_NAMES.has(property.name.toLowerCase())
        ) ?? [];
    const sourceProperties = new Map(sourceEntity?.properties.map((property) => [property.name, property]));
    const inferredMappings = businessKeys.flatMap((targetProperty) => {
        const sourceProperty = sourceProperties.get(targetProperty.name);
        return sourceProperty?.primitiveType === targetProperty.primitiveType
            ? [{ sourceProperty: sourceProperty.name, targetProperty: targetProperty.name }]
            : [];
    });
    const isDraftNavigation =
        DRAFT_NAVIGATION_NAMES.has(name.toLowerCase()) ||
        canonicalTargetType?.toLowerCase().includes(DRAFT_ADMINISTRATIVE_DATA_TYPE) === true;
    if (
        !targetEntitySet ||
        businessKeys.length === 0 ||
        inferredMappings.length !== businessKeys.length ||
        isDraftNavigation
    ) {
        return undefined;
    }
    return {
        name,
        fromEntitySet: entitySetName,
        toEntitySet: targetEntitySet,
        mappings: inferredMappings,
        provenance: 'inferred',
        confidence: 0.8,
        ...navigationDetails
    };
}

/**
 * The relationship of an OData V2 navigation whose association declares a referential constraint from
 * the navigation's source role (the dependent) to its target role (the principal).
 *
 * @param source - The navigation and its entity set.
 * @param relationshipName - The qualified association name.
 * @param associations - Association nodes by qualified name.
 * @param entitySetByType - Entity type name to the first entity set of that type.
 * @returns The explicit relationship, or undefined when the association does not constrain this direction.
 */
function associationRelationship(
    source: NavigationSource,
    relationshipName: string,
    associations: ReadonlyMap<string, XmlRecord>,
    entitySetByType: ReadonlyMap<string, string>
): SchemaRelationship | undefined {
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
    if (sourceRole !== dependentRole || targetRole !== principalRole) {
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
    return {
        name,
        fromEntitySet: entitySetName,
        toEntitySet: targetEntitySet,
        mappings: sourceProperties.map((sourceProperty, index) => ({
            sourceProperty,
            targetProperty: targetProperties[index]
        })),
        provenance: 'explicit',
        confidence: 1,
        targetCardinality: associationTargetCardinality(targetEnd?.Multiplicity)
    };
}

/**
 * Read the relationships of every navigation property of the generatable entity sets, in document order.
 *
 * @param context - The parsed document.
 * @param collection - The generatable entity sets.
 * @returns The relationships, before filtering to generatable ones.
 */
function collectRelationships(context: EdmxParseContext, collection: EntitySetCollection): SchemaRelationship[] {
    const { entities, entitySetByType, entitySets } = collection;
    const associations = indexAssociations(context.schemas);
    const relationships: SchemaRelationship[] = [];
    const entitiesBySet = new Map(entities.map((entity) => [entity.entitySetName, entity]));
    for (const { entitySet, entitySetName, qualifiedType } of entitySets) {
        const hierarchy = entityTypeHierarchy(context.entityTypes, qualifiedType);
        const sourceTypes = typeof hierarchy === 'string' ? [] : hierarchy.map(({ entityType }) => entityType);
        const bindings = new Map(
            asArray(entitySet.NavigationPropertyBinding).map((binding) => [
                requiredString(binding.Path, 'navigation binding path').split('/')[0],
                unqualifiedName(requiredString(binding.Target, 'navigation binding target'))
            ])
        );
        for (const navigation of sourceTypes.flatMap((sourceType) => asArray(sourceType.NavigationProperty))) {
            const name = requiredString(navigation.Name, 'navigation property name');
            const targetCardinality = navigationTargetCardinality(navigation);
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
                }
            };
            const v4Constraints = asArray(navigation.ReferentialConstraint);
            let relationship: SchemaRelationship | undefined;
            if (v4Constraints.length > 0) {
                relationship = constrainedNavigationRelationship(source, v4Constraints, entitySetByType);
            } else if (typeof navigation.Relationship === 'string') {
                relationship = associationRelationship(source, navigation.Relationship, associations, entitySetByType);
            } else {
                relationship = inferredNavigationRelationship(source, context, entitySets, entitiesBySet);
            }
            if (relationship) {
                relationships.push(relationship);
            }
        }
    }
    return relationships;
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
