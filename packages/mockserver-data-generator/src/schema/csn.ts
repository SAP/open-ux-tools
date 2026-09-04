import type {
    PrimitiveType,
    SchemaAnnotation,
    SchemaEntity,
    SchemaGraph,
    SchemaProperty,
    SchemaRelationship
} from './graph.js';

type CsnRecord = Record<string, unknown>;

function isRecord(value: unknown): value is CsnRecord {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function typeName(value: unknown): string {
    if (typeof value === 'string') {
        return value;
    }
    if (isRecord(value) && Array.isArray(value.ref)) {
        const last = value.ref.at(-1);
        return typeof last === 'string' ? last : '';
    }
    return '';
}

function primitiveType(value: unknown): PrimitiveType {
    switch (typeName(value)) {
        case 'cds.Integer':
        case 'cds.Integer16':
        case 'cds.Integer32':
        case 'cds.Integer64':
        case 'cds.UInt8':
            return 'int';
        case 'cds.Decimal':
        case 'cds.DecimalFloat':
        case 'cds.Double':
            return 'decimal';
        case 'cds.Boolean':
            return 'bool';
        case 'cds.UUID':
            return 'guid';
        case 'cds.Date':
            return 'date';
        case 'cds.DateTime':
            return 'datetime';
        case 'cds.Timestamp':
            return 'datetimeoffset';
        case 'cds.Time':
            return 'time';
        case 'cds.Binary':
        case 'cds.LargeBinary':
            return 'binary';
        default:
            return 'string';
    }
}

function optionalInteger(value: unknown): number | undefined {
    return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : undefined;
}

function isAssociation(element: CsnRecord): boolean {
    const name = typeName(element.type);
    return typeof element.target === 'string' || name === 'cds.Association' || name === 'cds.Composition';
}

function localEntityName(qualifiedName: string): string {
    const parts = qualifiedName.split('.');
    return parts.length > 1 ? parts.slice(1).join('_') : qualifiedName;
}

function uniqueEntityNames(qualifiedNames: ReadonlyArray<string>): ReadonlyMap<string, string> {
    const candidates = qualifiedNames.map((qualifiedName) => [qualifiedName, localEntityName(qualifiedName)] as const);
    const counts = new Map<string, number>();
    for (const [, localName] of candidates) {
        counts.set(localName, (counts.get(localName) ?? 0) + 1);
    }
    return new Map(
        candidates.map(([qualifiedName, localName]) => [
            qualifiedName,
            counts.get(localName) === 1 ? localName : qualifiedName
        ])
    );
}

function resolveElement(
    element: CsnRecord,
    definitions: Readonly<Record<string, CsnRecord>>,
    visited: ReadonlySet<string> = new Set()
): CsnRecord {
    const name = typeName(element.type);
    if (!name || name.startsWith('cds.') || visited.has(name)) {
        return element;
    }
    const definition = definitions[name];
    if (!definition || definition.type === undefined) {
        return element;
    }
    const inherited = resolveElement(definition, definitions, new Set(visited).add(name));
    return { ...inherited, ...element, type: inherited.type, enum: element.enum ?? inherited.enum };
}

function annotations(element: CsnRecord): ReadonlyArray<SchemaAnnotation> {
    return Object.entries(element)
        .filter(([name]) => name.startsWith('@'))
        .map(([name, value]) => ({
            term: name.slice(1),
            ...(typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' ? { value } : {})
        }));
}

function stringAnnotation(element: CsnRecord, ...names: ReadonlyArray<string>): string | undefined {
    for (const name of names) {
        const value = element[`@${name}`];
        if (typeof value === 'string') {
            return value;
        }
    }
    return undefined;
}

function enumValues(element: CsnRecord): ReadonlyArray<string | number | boolean> | undefined {
    if (!isRecord(element.enum)) {
        return undefined;
    }
    return Object.entries(element.enum).map(([name, definition]) => {
        if (isRecord(definition)) {
            const value = definition.val;
            if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
                return value;
            }
        }
        return name;
    });
}

function property(name: string, declared: CsnRecord, resolved: CsnRecord): SchemaProperty {
    const label = stringAnnotation(resolved, 'Common.Label', 'title');
    const description = stringAnnotation(resolved, 'Core.Description', 'description');
    const dataElement = stringAnnotation(resolved, 'sap.dataElement', 'SAP.Common.DataElement');
    const values = enumValues(resolved);
    return {
        name,
        primitiveType: primitiveType(resolved.type),
        nullable: resolved.notNull !== true,
        isKey: declared.key === true,
        maxLength: optionalInteger(resolved.length),
        precision: optionalInteger(resolved.precision),
        scale: optionalInteger(resolved.scale),
        ...(label ? { label } : {}),
        ...(description ? { description } : {}),
        ...(dataElement ? { dataElement } : {}),
        ...(values ? { enumValues: values } : {}),
        annotations: annotations(resolved)
    };
}

/**
 * Parse a JSON-serialized CAP CSN document into the canonical generation graph.
 *
 * @param content
 */
export function parseCsn(content: string): SchemaGraph {
    const parsed: unknown = JSON.parse(content);
    if (!isRecord(parsed) || !isRecord(parsed.definitions)) {
        throw new TypeError('CAP CSN must contain a definitions object');
    }
    const definitions = Object.fromEntries(
        Object.entries(parsed.definitions).filter((entry): entry is [string, CsnRecord] => isRecord(entry[1]))
    );
    const entityDefinitions = Object.entries(definitions).filter(([, definition]) => definition.kind === 'entity');
    const names = uniqueEntityNames(entityDefinitions.map(([qualifiedName]) => qualifiedName));
    const entities: SchemaEntity[] = [];
    const relationships: SchemaRelationship[] = [];

    for (const [qualifiedName, definition] of entityDefinitions) {
        const entitySetName = names.get(qualifiedName);
        if (!entitySetName) {
            continue;
        }
        const elements = isRecord(definition.elements) ? definition.elements : {};
        const scalarProperties: SchemaProperty[] = [];
        for (const [name, candidate] of Object.entries(elements)) {
            if (!isRecord(candidate) || isAssociation(candidate)) {
                continue;
            }
            scalarProperties.push(property(name, candidate, resolveElement(candidate, definitions)));
        }

        for (const [associationName, candidate] of Object.entries(elements)) {
            if (!isRecord(candidate) || !isAssociation(candidate) || typeof candidate.target !== 'string') {
                continue;
            }
            const targetEntitySet = names.get(candidate.target);
            const targetDefinition = definitions[candidate.target];
            const targetElements =
                targetDefinition && isRecord(targetDefinition.elements) ? targetDefinition.elements : {};
            if (!targetEntitySet || !Array.isArray(candidate.keys)) {
                continue;
            }
            const mappings: Array<{ sourceProperty: string; targetProperty: string }> = [];
            for (const key of candidate.keys) {
                if (!isRecord(key) || !Array.isArray(key.ref)) {
                    continue;
                }
                const targetProperty = key.ref.at(-1);
                if (typeof targetProperty !== 'string') {
                    continue;
                }
                const sourceProperty = typeof key.as === 'string' ? key.as : `${associationName}_${targetProperty}`;
                const targetElement = targetElements[targetProperty];
                if (!isRecord(targetElement) || isAssociation(targetElement)) {
                    continue;
                }
                if (!scalarProperties.some((candidateProperty) => candidateProperty.name === sourceProperty)) {
                    const inherited = property(sourceProperty, {}, resolveElement(targetElement, definitions));
                    scalarProperties.push({ ...inherited, nullable: candidate.notNull !== true, isKey: false });
                }
                mappings.push({ sourceProperty, targetProperty });
            }
            if (mappings.length > 0) {
                relationships.push({
                    name: associationName,
                    fromEntitySet: entitySetName,
                    toEntitySet: targetEntitySet,
                    mappings: Object.freeze(mappings)
                });
            }
        }

        entities.push({
            name: entitySetName,
            entitySetName,
            properties: Object.freeze(scalarProperties.sort((left, right) => left.name.localeCompare(right.name)))
        });
    }

    return Object.freeze({
        namespace: 'CAPService',
        entities: Object.freeze(entities.sort((left, right) => left.entitySetName.localeCompare(right.entitySetName))),
        relationships: Object.freeze(
            relationships.sort((left, right) =>
                `${left.fromEntitySet}.${left.name}`.localeCompare(`${right.fromEntitySet}.${right.name}`)
            )
        )
    });
}
