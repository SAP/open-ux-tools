import { XMLParser } from 'fast-xml-parser';
import type {
    PrimitiveType,
    SchemaAnnotation,
    SchemaEntity,
    SchemaGraph,
    SchemaProperty,
    SchemaRelationship
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

function primitiveType(type: string): PrimitiveType {
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
            throw new TypeError(`EDMX contains unsupported property type ${type}`);
    }
}

function annotations(property: XmlRecord): SchemaAnnotation[] {
    return asArray(property.Annotation)
        .filter((annotation) => typeof annotation.Term === 'string')
        .map((annotation) => {
            const valueEntry = ['String', 'Bool', 'Int', 'Float', 'Decimal'].find(
                (key) => annotation[key] !== undefined
            );
            const value = valueEntry ? annotation[valueEntry] : undefined;
            return {
                term: annotation.Term as string,
                ...(typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
                    ? { value }
                    : {})
            };
        });
}

function parseProperty(
    property: XmlRecord,
    keys: ReadonlySet<string>,
    structuredTypes: ReadonlySet<string>
): SchemaProperty | undefined {
    const name = requiredString(property.Name, 'property name');
    const declaredType = requiredString(property.Type, `type for ${name}`);
    if (/^Collection\(.+\)$/.test(declaredType) || structuredTypes.has(declaredType)) {
        if (keys.has(name)) {
            throw new TypeError(`EDMX key ${name} cannot use unsupported structured type ${declaredType}`);
        }
        return undefined;
    }
    const propertyAnnotations = annotations(property);
    const label = propertyAnnotations.find((annotation) => annotation.term.endsWith('.Label'))?.value;
    return {
        name,
        primitiveType: primitiveType(declaredType),
        nullable: property.Nullable !== false && property.Nullable !== 'false',
        isKey: keys.has(name),
        maxLength: optionalInteger(property.MaxLength),
        precision: optionalInteger(property.Precision),
        scale: optionalInteger(property.Scale),
        ...(typeof label === 'string' ? { label } : {}),
        annotations: propertyAnnotations
    };
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

    const structuredTypes = new Set<string>();
    for (const schema of schemas) {
        const namespace = requiredString(schema.Namespace, 'schema namespace');
        const alias = typeof schema.Alias === 'string' && schema.Alias.length > 0 ? schema.Alias : undefined;
        for (const complexType of asArray(schema.ComplexType)) {
            const name = requiredString(complexType.Name, 'complex type name');
            structuredTypes.add(`${namespace}.${name}`);
            if (alias) {
                structuredTypes.add(`${alias}.${name}`);
            }
        }
    }

    const entityTypes = new Map<string, { schema: XmlRecord; entityType: XmlRecord }>();
    for (const schema of schemas) {
        const namespace = requiredString(schema.Namespace, 'schema namespace');
        for (const entityType of asArray(schema.EntityType)) {
            const name = requiredString(entityType.Name, 'entity type name');
            entityTypes.set(`${namespace}.${name}`, { schema, entityType });
        }
    }
    const entityTypeHierarchy = (qualifiedType: string, visiting: ReadonlySet<string> = new Set()): XmlRecord[] => {
        if (visiting.has(qualifiedType)) {
            throw new TypeError(`EDMX entity inheritance contains a cycle at ${qualifiedType}`);
        }
        const resolved = entityTypes.get(qualifiedType);
        if (!resolved) {
            throw new TypeError(`EDMX references unknown entity type ${qualifiedType}`);
        }
        if (typeof resolved.entityType.BaseType !== 'string') {
            return [resolved.entityType];
        }
        return [
            ...entityTypeHierarchy(resolved.entityType.BaseType, new Set([...visiting, qualifiedType])),
            resolved.entityType
        ];
    };

    const entities: SchemaEntity[] = [];
    const entitySetByType = new Map<string, string>();
    const entitySets: Array<{ entitySet: XmlRecord; entitySetName: string; qualifiedType: string }> = [];
    for (const schema of schemas) {
        for (const container of asArray(schema.EntityContainer)) {
            const resources = [
                ...asArray(container.EntitySet).map((resource) => ({ resource, typeAttribute: 'EntityType' })),
                ...asArray(container.Singleton).map((resource) => ({ resource, typeAttribute: 'Type' }))
            ];
            for (const { resource: entitySet, typeAttribute } of resources) {
                const entitySetName = requiredString(entitySet.Name, 'entity set name');
                const qualifiedType = requiredString(entitySet[typeAttribute], `entity type for ${entitySetName}`);
                const resolved = entityTypes.get(qualifiedType);
                if (!resolved) {
                    throw new TypeError(`EDMX entity set ${entitySetName} references unknown type ${qualifiedType}`);
                }
                const hierarchy = entityTypeHierarchy(qualifiedType);
                const keyNames = new Set(
                    hierarchy.flatMap((entityType) =>
                        asArray(isRecord(entityType.Key) ? entityType.Key.PropertyRef : undefined).map((key) =>
                            requiredString(key.Name, `key in ${qualifiedType}`)
                        )
                    )
                );
                const properties = new Map<string, SchemaProperty>();
                for (const entityType of hierarchy) {
                    for (const property of asArray(entityType.Property)) {
                        const parsedProperty = parseProperty(property, keyNames, structuredTypes);
                        if (parsedProperty) {
                            properties.set(parsedProperty.name, parsedProperty);
                        }
                    }
                }
                entities.push({
                    name: requiredString(resolved.entityType.Name, 'entity type name'),
                    entitySetName,
                    properties: [...properties.values()]
                });
                if (!entitySetByType.has(qualifiedType)) {
                    entitySetByType.set(qualifiedType, entitySetName);
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
    for (const { entitySet, entitySetName, qualifiedType } of entitySets) {
        const sourceTypes = entityTypeHierarchy(qualifiedType);
        const bindings = new Map(
            asArray(entitySet.NavigationPropertyBinding).map((binding) => [
                requiredString(binding.Path, 'navigation binding path').split('/')[0],
                unqualifiedName(requiredString(binding.Target, 'navigation binding target'))
            ])
        );
        for (const navigation of sourceTypes.flatMap((sourceType) => asArray(sourceType.NavigationProperty))) {
            const name = requiredString(navigation.Name, 'navigation property name');
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
                    }))
                });
                continue;
            }

            if (typeof navigation.Relationship !== 'string') {
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
                }))
            });
        }
    }

    return {
        namespace: requiredString(schemas[0].Namespace, 'schema namespace'),
        entities: entities.sort((left, right) => left.entitySetName.localeCompare(right.entitySetName)),
        relationships: relationships.sort((left, right) =>
            `${left.fromEntitySet}.${left.name}`.localeCompare(`${right.fromEntitySet}.${right.name}`)
        )
    };
}
