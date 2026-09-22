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
    SchemaValueListParameter,
    SchemaValueListParameterDirection
} from './graph.js';

type XmlRecord = Record<string, unknown>;

function isRecord(value: unknown): value is XmlRecord {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function asArray(value: unknown): XmlRecord[] {
    if (Array.isArray(value)) {
        return value.filter(isRecord);
    }
    return isRecord(value) ? [value] : [];
}

function requiredString(value: unknown, label: string): string {
    if (typeof value !== 'string' || value.length === 0) {
        throw new TypeError(`EDMX ${label} must be a non-empty string`);
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
    switch (type) {
        case 'Edm.String':
            return 'string';
        case 'Edm.Byte':
        case 'Edm.SByte':
        case 'Edm.Int16':
        case 'Edm.Int32':
        case 'Edm.Int64':
            return 'int';
        case 'Edm.Decimal':
        case 'Edm.Double':
        case 'Edm.Single':
            return 'decimal';
        case 'Edm.Boolean':
            return 'bool';
        case 'Edm.Guid':
            return 'guid';
        case 'Edm.Date':
            return 'date';
        case 'Edm.DateTime':
            return 'datetime';
        case 'Edm.DateTimeOffset':
            return 'datetimeoffset';
        case 'Edm.Binary':
            return 'binary';
        case 'Edm.Time':
        case 'Edm.TimeOfDay':
            return 'time';
        default:
            return undefined;
    }
}

function integerBounds(type: string): Readonly<{ numericMinimum: number; numericMaximum: number }> | undefined {
    switch (type) {
        case 'Edm.Byte':
            return { numericMinimum: 0, numericMaximum: 255 };
        case 'Edm.SByte':
            return { numericMinimum: -128, numericMaximum: 127 };
        case 'Edm.Int16':
            return { numericMinimum: -32_768, numericMaximum: 32_767 };
        case 'Edm.Int32':
            return { numericMinimum: -2_147_483_648, numericMaximum: 2_147_483_647 };
        case 'Edm.Int64':
            return { numericMinimum: Number.MIN_SAFE_INTEGER, numericMaximum: Number.MAX_SAFE_INTEGER };
        default:
            return undefined;
    }
}

/**
 * Reduce supported primitive EDMX annotation expressions to the canonical form.
 *
 * @param value - One annotation node or an array of annotation nodes.
 * @returns Canonical annotations in document order.
 */
function parseAnnotations(value: unknown): SchemaAnnotation[] {
    return asArray(value)
        .filter((annotation) => typeof annotation.Term === 'string')
        .map((annotation) => {
            const valueEntry = [
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
            ].find((key) => annotation[key] !== undefined);
            const value = valueEntry ? annotation[valueEntry] : undefined;
            return {
                term: annotation.Term as string,
                ...(valueEntry ? { expressionKind: valueEntry } : {}),
                ...(typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
                    ? { value }
                    : {})
            };
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
    const sapAttributes: ReadonlyArray<readonly [string, string]> = [
        ['semantics', 'sap:semantics'],
        ['unit', 'sap:unit'],
        ['text', 'sap:text'],
        ['display-format', 'sap:display-format'],
        ['field-control', 'sap:field-control']
    ];
    return [
        ...inline,
        ...sapAttributes.flatMap(([attribute, term]) => {
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
        (candidate) => typeof candidate.Term === 'string' && candidate.Term.toLowerCase().endsWith('.valuelist')
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
        const direction =
            typeof record.Type === 'string'
                ? /ValueListParameter(InOut|In|Out|DisplayOnly)$/u.exec(record.Type)?.[1]
                : undefined;
        if (direction && !['In', 'Out', 'InOut', 'DisplayOnly'].includes(direction)) {
            return [];
        }
        const parameter: SchemaValueListParameter = {
            // Older metadata omits the ValueListParameter type. Treat that
            // mapping as InOut conservatively while retaining explicit types.
            direction: (direction ?? 'InOut') as SchemaValueListParameterDirection,
            ...(typeof localProperty === 'string' ? { localProperty } : {}),
            ...(typeof valueListProperty === 'string' ? { valueListProperty } : {}),
            ...(constantEntry &&
            (typeof constant?.[constantEntry] === 'string' ||
                typeof constant?.[constantEntry] === 'number' ||
                typeof constant?.[constantEntry] === 'boolean')
                ? { constant: constant[constantEntry] as string | number | boolean }
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
        annotation.term.toLowerCase().endsWith('.documentationref')
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
    if (declaredType === 'Edm.DateTime' && property['display-format'] === 'Date') {
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

const DRAFT_NAVIGATION_NAMES = new Set([
    'draftadministrativedata',
    'siblingentity',
    'draftadministrativedata_draftuuid'
]);

const DRAFT_PROPERTY_NAMES = new Set(['draftuuid', 'isactiveentity', 'hasactiveentity', 'hasdraftentity']);

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

/**
 * Parse the host-provided, already-resolved EDMX into the generator's canonical graph.
 *
 * @param content
 */
export function parseEdmx(content: string): SchemaGraph {
    const parsed: unknown = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '',
        removeNSPrefix: true,
        parseAttributeValue: true
    }).parse(content);
    if (!isRecord(parsed) || !isRecord(parsed.Edmx) || !isRecord(parsed.Edmx.DataServices)) {
        throw new TypeError('EDMX document must contain Edmx/DataServices');
    }
    const schemas = asArray(parsed.Edmx.DataServices.Schema);
    if (schemas.length === 0) {
        throw new TypeError('EDMX document must contain at least one Schema');
    }

    const namespaceAliases = new Map<string, string>();
    const structuredTypes = new Set<string>();
    const enumMembers = new Map<string, ReadonlyArray<string>>();
    for (const schema of schemas) {
        const namespace = requiredString(schema.Namespace, 'schema namespace');
        const alias = typeof schema.Alias === 'string' && schema.Alias.length > 0 ? schema.Alias : undefined;
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

    const canonicalQualifiedType = (qualifiedType: string): string => {
        const separator = qualifiedType.lastIndexOf('.');
        if (separator <= 0 || separator === qualifiedType.length - 1) {
            return qualifiedType;
        }
        const qualifier = qualifiedType.slice(0, separator);
        const localName = qualifiedType.slice(separator + 1);
        return `${namespaceAliases.get(qualifier) ?? qualifier}.${localName}`;
    };
    const externalAnnotationNodes = new Map<string, XmlRecord[]>();
    for (const schema of schemas) {
        for (const group of asArray(schema.Annotations)) {
            const target = requiredString(group.Target, 'annotation target');
            const pathSeparator = target.indexOf('/');
            if (pathSeparator < 1 || pathSeparator === target.length - 1) {
                continue;
            }
            const canonicalTarget = `${canonicalQualifiedType(target.slice(0, pathSeparator))}${target.slice(
                pathSeparator
            )}`;
            const existing = externalAnnotationNodes.get(canonicalTarget) ?? [];
            externalAnnotationNodes.set(canonicalTarget, [...existing, ...asArray(group.Annotation)]);
        }
    }

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

    interface ResolvedEntityType {
        qualifiedType: string;
        schema: XmlRecord;
        entityType: XmlRecord;
    }
    const entityTypes = new Map<string, ResolvedEntityType>();
    for (const schema of schemas) {
        const namespace = requiredString(schema.Namespace, 'schema namespace');
        const alias = typeof schema.Alias === 'string' && schema.Alias.length > 0 ? schema.Alias : undefined;
        for (const entityType of asArray(schema.EntityType)) {
            const name = requiredString(entityType.Name, 'entity type name');
            const resolved = { qualifiedType: `${namespace}.${name}`, schema, entityType };
            entityTypes.set(resolved.qualifiedType, resolved);
            if (alias) {
                entityTypes.set(`${alias}.${name}`, resolved);
            }
        }
    }
    /**
     * Resolve an entity type and its base types, root first.
     *
     * @param qualifiedType - Namespace- or alias-qualified entity type name.
     * @param visiting - Types already on the inheritance path, to detect cycles.
     * @returns The hierarchy, or the reason it cannot be resolved within this document.
     */
    const entityTypeHierarchy = (
        qualifiedType: string,
        visiting: ReadonlySet<string> = new Set()
    ): ResolvedEntityType[] | string => {
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
        const base = entityTypeHierarchy(resolved.entityType.BaseType, new Set([...visiting, resolved.qualifiedType]));
        return typeof base === 'string' ? base : [...base, resolved];
    };

    const entities: SchemaEntity[] = [];
    // An entity set whose rows cannot be generated is skipped on its own; the rest of the service is
    // still generated, and the caller receives a diagnostic for a skipped target.
    const skippedEntitySets: SchemaSkippedEntitySet[] = [];
    const entitySetByType = new Map<string, string>();
    const entitySets: Array<{ entitySet: XmlRecord; entitySetName: string; qualifiedType: string }> = [];
    for (const schema of schemas) {
        for (const container of asArray(schema.EntityContainer)) {
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
                if (term.endsWith('.currencycodes')) {
                    kind = 'currency';
                } else if (term.endsWith('.unitsofmeasure')) {
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
            const resources = [
                ...asArray(container.EntitySet).map((resource) => ({ resource, typeAttribute: 'EntityType' })),
                ...asArray(container.Singleton).map((resource) => ({ resource, typeAttribute: 'Type' }))
            ];
            for (const { resource: entitySet, typeAttribute } of resources) {
                const entitySetName = requiredString(entitySet.Name, 'entity set name');
                const qualifiedType = requiredString(entitySet[typeAttribute], `entity type for ${entitySetName}`);
                const resolved = entityTypes.get(qualifiedType);
                const hierarchy = entityTypeHierarchy(qualifiedType);
                if (!resolved || typeof hierarchy === 'string') {
                    skippedEntitySets.push({
                        entitySetName,
                        reason: typeof hierarchy === 'string' ? hierarchy : `entity type ${qualifiedType} is unresolved`
                    });
                    continue;
                }
                // A blank key reference names no property, so it contributes no key value.
                const keyNames = new Set(
                    hierarchy.flatMap(({ entityType }) =>
                        asArray(isRecord(entityType.Key) ? entityType.Key.PropertyRef : undefined).flatMap((key) =>
                            typeof key.Name === 'string' && key.Name.length > 0 ? [key.Name] : []
                        )
                    )
                );
                const properties = new Map<string, SchemaProperty>();
                const structuredProperties = new Map<string, SchemaStructuredProperty>();
                const omittedProperties = new Map<string, SchemaOmittedProperty>();
                for (const { entityType, qualifiedType: hierarchyType } of hierarchy) {
                    for (const property of asArray(entityType.Property)) {
                        const propertyName = requiredString(property.Name, 'property name');
                        const annotationsForProperty =
                            externalAnnotationNodes.get(`${hierarchyType}/${propertyName}`) ?? [];
                        const parsed = parseProperty(
                            property,
                            keyNames,
                            structuredTypes,
                            enumMembers,
                            annotationsForProperty
                        );
                        if (parsed.kind === 'scalar') {
                            properties.set(parsed.property.name, parsed.property);
                        } else if (parsed.kind === 'omitted') {
                            omittedProperties.set(parsed.property.name, parsed.property);
                        } else {
                            const structured = parseStructuredProperty(
                                property,
                                structuredTypes,
                                annotationsForProperty
                            );
                            if (structured) {
                                structuredProperties.set(structured.name, structured);
                            }
                        }
                    }
                }
                const keyReason = ungeneratableKeyReason(keyNames, omittedProperties, structuredProperties);
                if (keyReason !== undefined) {
                    skippedEntitySets.push({ entitySetName, reason: keyReason });
                    continue;
                }
                entities.push({
                    name: requiredString(resolved.entityType.Name, 'entity type name'),
                    entitySetName,
                    ...(codeLists.has(entitySetName) ? { codeList: codeLists.get(entitySetName) } : {}),
                    properties: [...properties.values()].map((property) => {
                        const unit = property.links?.unit ? properties.get(property.links.unit) : undefined;
                        const currency = unit?.annotations.some(
                            ({ term, value }) =>
                                (term === 'sap:semantics' && value === 'currency-code') ||
                                (term.toLowerCase().endsWith('.iscurrency') && value !== false)
                        );
                        return currency && !property.links?.currency
                            ? { ...property, links: { ...property.links, currency: unit?.name } }
                            : property;
                    }),
                    structuredProperties: [...structuredProperties.values()],
                    ...(omittedProperties.size > 0 ? { omittedProperties: [...omittedProperties.values()] } : {})
                });
                if (!entitySetByType.has(qualifiedType)) {
                    entitySetByType.set(qualifiedType, entitySetName);
                }
                if (!entitySetByType.has(resolved.qualifiedType)) {
                    entitySetByType.set(resolved.qualifiedType, entitySetName);
                }
                entitySets.push({ entitySet, entitySetName, qualifiedType });
            }
        }
    }

    const associations = new Map<string, XmlRecord>();
    for (const schema of schemas) {
        const namespace = requiredString(schema.Namespace, 'schema namespace');
        for (const association of asArray(schema.Association)) {
            associations.set(`${namespace}.${requiredString(association.Name, 'association name')}`, association);
        }
    }

    const relationships: SchemaRelationship[] = [];
    const entitiesBySet = new Map(entities.map((entity) => [entity.entitySetName, entity]));
    for (const { entitySet, entitySetName, qualifiedType } of entitySets) {
        const hierarchy = entityTypeHierarchy(qualifiedType);
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
            const navigationDetails = {
                ...(targetCardinality ? { targetCardinality } : {}),
                ...(navigation.ContainsTarget === true || navigation.ContainsTarget === 'true'
                    ? { containsTarget: true }
                    : {}),
                ...(typeof navigation.Partner === 'string' ? { partner: navigation.Partner } : {})
            };
            const v4Constraints = asArray(navigation.ReferentialConstraint);
            if (v4Constraints.length > 0) {
                const targetType = entityTypeName(navigation.Type);
                const targetEntitySet =
                    bindings.get(name) ?? (targetType ? entitySetByType.get(targetType) : undefined);
                if (!targetEntitySet) {
                    continue;
                }
                relationships.push({
                    name,
                    fromEntitySet: entitySetName,
                    toEntitySet: targetEntitySet,
                    mappings: v4Constraints.map((constraint) => ({
                        sourceProperty: requiredString(constraint.Property, `source property for ${name}`),
                        targetProperty: requiredString(constraint.ReferencedProperty, `target property for ${name}`)
                    })),
                    provenance: 'explicit',
                    confidence: 1,
                    ...navigationDetails
                });
                continue;
            }

            if (typeof navigation.Relationship !== 'string') {
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
                        (property) => property.isKey && !DRAFT_PROPERTY_NAMES.has(property.name.toLowerCase())
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
                    canonicalTargetType?.toLowerCase().includes('draftadministrativedata') === true;
                if (
                    targetEntitySet &&
                    businessKeys.length > 0 &&
                    inferredMappings.length === businessKeys.length &&
                    !isDraftNavigation
                ) {
                    relationships.push({
                        name,
                        fromEntitySet: entitySetName,
                        toEntitySet: targetEntitySet,
                        mappings: inferredMappings,
                        provenance: 'inferred',
                        confidence: 0.8,
                        ...navigationDetails
                    });
                }
                continue;
            }
            const association = associations.get(navigation.Relationship);
            const constraint =
                association && isRecord(association.ReferentialConstraint)
                    ? association.ReferentialConstraint
                    : undefined;
            if (!association || !constraint || !isRecord(constraint.Principal) || !isRecord(constraint.Dependent)) {
                continue;
            }
            const sourceRole = typeof navigation.FromRole === 'string' ? navigation.FromRole : undefined;
            const targetRole = typeof navigation.ToRole === 'string' ? navigation.ToRole : undefined;
            const principalRole = requiredString(constraint.Principal.Role, `principal role for ${name}`);
            const dependentRole = requiredString(constraint.Dependent.Role, `dependent role for ${name}`);
            if (sourceRole !== dependentRole || targetRole !== principalRole) {
                continue;
            }
            const targetEnd = asArray(association.End).find((end) => end.Role === targetRole);
            const targetType = targetEnd ? entityTypeName(targetEnd.Type) : undefined;
            const targetEntitySet = targetType ? entitySetByType.get(targetType) : undefined;
            if (!targetEntitySet) {
                continue;
            }
            const sourceProperties = propertyRefs(constraint.Dependent.PropertyRef);
            const targetProperties = propertyRefs(constraint.Principal.PropertyRef);
            if (sourceProperties.length !== targetProperties.length || sourceProperties.length === 0) {
                continue;
            }
            relationships.push({
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
            });
        }
    }

    return {
        namespace: requiredString(schemas[0].Namespace, 'schema namespace'),
        entities: entities.sort((left, right) => left.entitySetName.localeCompare(right.entitySetName)),
        relationships: generatableRelationships(entities, relationships).sort((left, right) =>
            `${left.fromEntitySet}.${left.name}`.localeCompare(`${right.fromEntitySet}.${right.name}`)
        ),
        complexTypes: complexTypes.sort((left, right) => left.qualifiedName.localeCompare(right.qualifiedName)),
        ...(skippedEntitySets.length > 0
            ? {
                  skippedEntitySets: skippedEntitySets.sort((left, right) =>
                      left.entitySetName.localeCompare(right.entitySetName)
                  )
              }
            : {})
    };
}
