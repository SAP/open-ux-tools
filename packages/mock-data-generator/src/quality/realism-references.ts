import type { SchemaEntity, SchemaRelationship } from '../schema/graph.js';
import type { JsonValue, MockDataRow } from '../types.js';
import { generatedRows, heldAs, OutcomeCollector, REALISM_CHECK } from './realism-types.js';
import type { CheckOutcome, RealismInput } from './realism-types.js';

/** One relationship mapping whose source and target both name a local text field. */
interface TextedMapping {
    sourceProperty: string;
    sourceText: string;
    targetText: string;
}

/**
 * The name of the local text field of a property: its text link when that names a property of the same
 * entity, not a navigation path.
 *
 * @param entity schema entity
 * @param propertyName property name
 * @returns the text field name, or undefined
 */
function localText(entity: SchemaEntity, propertyName: string): string | undefined {
    const text = entity.properties.find(({ name }) => name === propertyName)?.links?.text;
    return text && entity.properties.some(({ name }) => name === text) ? text : undefined;
}

/**
 * Whether a text field is the text of a key of its own entity other than the given property: it then names
 * the row itself, so it is not the text of a reference too (CAP gives a foreign key the text annotation of
 * the key it references, which in a self-reference names the row's own text field).
 *
 * @param entity schema entity
 * @param text the text field name
 * @param propertyName the referencing property
 * @returns true when another key of the entity has this text
 */
export function namesOwnRow(entity: SchemaEntity, text: string, propertyName: string): boolean {
    return entity.properties.some(({ isKey, name, links }) => isKey && name !== propertyName && links?.text === text);
}

/**
 * The mappings of a relationship whose source and target properties both have a local text field, unless the
 * source's text field names the source row itself.
 *
 * @param relationship the relationship
 * @param source entity of the relationship's source set
 * @param target entity of the relationship's target set
 * @returns the mappings with their text fields
 */
function textedMappings(relationship: SchemaRelationship, source: SchemaEntity, target: SchemaEntity): TextedMapping[] {
    return relationship.mappings.flatMap(({ sourceProperty, targetProperty }) => {
        const sourceText = localText(source, sourceProperty);
        const targetText = localText(target, targetProperty);
        return sourceText &&
            targetText &&
            sourceText !== sourceProperty &&
            !namesOwnRow(source, sourceText, sourceProperty)
            ? [{ sourceProperty, sourceText, targetText }]
            : [];
    });
}

/**
 * Index rows by the JSON of their values for the given properties.
 *
 * @param rows rows to index
 * @param properties properties that form the lookup key
 * @returns rows by key; a key held by several rows maps to all of them
 */
function rowsByTuple(rows: ReadonlyArray<MockDataRow>, properties: ReadonlyArray<string>): Map<string, MockDataRow[]> {
    const index = new Map<string, MockDataRow[]>();
    for (const row of rows) {
        const key = JSON.stringify(properties.map((property) => row[property] ?? null));
        index.set(key, [...(index.get(key) ?? []), row]);
    }
    return index;
}

/**
 * Whether a cell holds a text to compare.
 *
 * @param value cell value
 * @returns true for a non-empty string
 */
function isText(value: JsonValue | undefined): value is string {
    return typeof value === 'string' && value.length > 0;
}

/**
 * The text of a referencing field equals the text of the row it references, when the mapped properties at both ends
 * have a text field. References that select no single row, and empty texts, are not examined.
 *
 * @param input check input
 * @returns findings per referencing text field
 */
export function checkReferenceTexts(input: RealismInput): CheckOutcome {
    const collector = new OutcomeCollector(REALISM_CHECK.referenceText);
    const entities = new Map(input.graph.entities.map((entity) => [entity.entitySetName, entity]));
    // Two relationships may map the same fields (a navigation and its partner); each field is examined once.
    const examined = new Set<string>();
    for (const relationship of input.graph.relationships) {
        const source = entities.get(relationship.fromEntitySet);
        const target = entities.get(relationship.toEntitySet);
        const mappings = source && target ? textedMappings(relationship, source, target) : [];
        if (mappings.length === 0) {
            continue;
        }
        const targetRows = rowsByTuple(
            input.resources[relationship.toEntitySet] ?? [],
            relationship.mappings.map(({ targetProperty }) => targetProperty)
        );
        const sourceRows = generatedRows(input, relationship.fromEntitySet);
        for (const mapping of mappings) {
            const field = `${relationship.fromEntitySet}.${mapping.sourceText}>${relationship.toEntitySet}.${mapping.targetText}`;
            if (examined.has(field)) {
                continue;
            }
            examined.add(field);
            const textProperty = source?.properties.find(({ name }) => name === mapping.sourceText);
            const compared = sourceRows.flatMap((row) => {
                const key = JSON.stringify(
                    relationship.mappings.map(({ sourceProperty }) => row[sourceProperty] ?? null)
                );
                const referenced = targetRows.get(key);
                const own = row[mapping.sourceText];
                const theirs = heldAs(
                    textProperty,
                    referenced?.length === 1 ? referenced[0][mapping.targetText] : undefined
                );
                return isText(own) && isText(theirs) ? [{ own, theirs }] : [];
            });
            collector.field({
                entitySet: relationship.fromEntitySet,
                property: mapping.sourceText,
                related: `${relationship.toEntitySet}.${mapping.targetText}`,
                checked: compared.length,
                failing: compared.filter(({ own, theirs }) => own !== theirs).map(({ own }) => own)
            });
        }
    }
    return collector.outcome();
}

/**
 * A property that repeats the referenced row's semantic key holds that row's value: when a relationship
 * references an entity that declares a semantic key, and the referencing entity has a non-key property of the
 * same name and type that no relationship maps, a row's value is the value of the row its reference selects.
 *
 * @param input check input
 * @returns findings per repeating property
 */
export function checkReferenceCopies(input: RealismInput): CheckOutcome {
    const collector = new OutcomeCollector(REALISM_CHECK.referenceCopy);
    const entities = new Map(input.graph.entities.map((entity) => [entity.entitySetName, entity]));
    const mapped = new Set(
        input.graph.relationships.flatMap(({ fromEntitySet, mappings }) =>
            mappings.map(({ sourceProperty }) => `${fromEntitySet}.${sourceProperty}`)
        )
    );
    const examined = new Set<string>();
    for (const relationship of input.graph.relationships) {
        const source = entities.get(relationship.fromEntitySet);
        const target = entities.get(relationship.toEntitySet);
        for (const name of target?.semanticKey ?? []) {
            const repeated = source?.properties.find((property) => property.name === name);
            const declared = target?.properties.find((property) => property.name === name);
            const field = `${relationship.fromEntitySet}.${name}`;
            if (
                !repeated ||
                !declared ||
                repeated.isKey ||
                mapped.has(field) ||
                repeated.primitiveType !== declared.primitiveType ||
                examined.has(field)
            ) {
                continue;
            }
            examined.add(field);
            const targetRows = rowsByTuple(
                input.resources[relationship.toEntitySet] ?? [],
                relationship.mappings.map(({ targetProperty }) => targetProperty)
            );
            const compared = generatedRows(input, relationship.fromEntitySet).flatMap((row) => {
                const key = JSON.stringify(
                    relationship.mappings.map(({ sourceProperty }) => row[sourceProperty] ?? null)
                );
                const referenced = targetRows.get(key);
                const own = row[name];
                const theirs = heldAs(repeated, referenced?.length === 1 ? referenced[0][name] : undefined);
                return own != null && theirs != null ? [{ own, theirs }] : [];
            });
            collector.field({
                entitySet: relationship.fromEntitySet,
                property: name,
                related: `${relationship.toEntitySet}.${name}`,
                checked: compared.length,
                failing: compared
                    .filter(({ own, theirs }) => JSON.stringify(own) !== JSON.stringify(theirs))
                    .map(({ own }) => own)
            });
        }
    }
    return collector.outcome();
}

/**
 * The generated rows of an entity set whose identifier repeats the identifier of another row of the set,
 * supplied or generated: the value of their first identifier property. Rows with an empty identifier value
 * are not examined.
 *
 * @param input check input
 * @param entitySet the entity set
 * @param names the identifier's properties
 * @returns the examined generated rows and the first identifier value of each repeating one
 */
function repeatedIdentifiers(
    input: RealismInput,
    entitySet: string,
    names: ReadonlyArray<string>
): { checked: number; failing: JsonValue[] } {
    const tuple = (row: MockDataRow): JsonValue[] | undefined => {
        const values = names.map((name) => row[name]);
        return values.every((value) => value != null && value !== '') ? values : undefined;
    };
    const rows = input.resources[entitySet] ?? [];
    const supplied = rows.filter((_row, index) => input.isSupplied?.(entitySet, index));
    const seen = new Set(
        supplied.flatMap((row) => {
            const values = tuple(row);
            return values ? [JSON.stringify(values)] : [];
        })
    );
    const tuples = generatedRows(input, entitySet).flatMap((row) => {
        const values = tuple(row);
        return values ? [values] : [];
    });
    const failing = tuples.filter((values) => {
        const key = JSON.stringify(values);
        const again = seen.has(key);
        seen.add(key);
        return again;
    });
    return { checked: tuples.length, failing: failing.map((values) => values[0]) };
}

/**
 * The semantic key of an entity (`Common.SemanticKey`) identifies one row: no generated row shares its values
 * with another row of the set, supplied or generated. Rows with an empty semantic-key value are not examined.
 *
 * @param input check input
 * @returns findings per entity, on the first semantic-key property
 */
export function checkSemanticKeys(input: RealismInput): CheckOutcome {
    const collector = new OutcomeCollector(REALISM_CHECK.semanticKeyUnique);
    for (const entity of input.graph.entities) {
        const names = entity.semanticKey ?? [];
        if (names.length === 0) {
            continue;
        }
        collector.field({
            entitySet: entity.entitySetName,
            property: names[0],
            ...repeatedIdentifiers(input, entity.entitySetName, names)
        });
    }
    return collector.outcome();
}

/**
 * The identifiers of each entity set beside its key and semantic key: its alternate keys (`Core.AlternateKeys`)
 * and the target properties of each declared to-one reference to it that do not hold its complete key, since
 * such a reference selects one row by them.
 *
 * @param input check input
 * @returns the property names of each identifier, by entity set
 */
function declaredIdentifiers(input: RealismInput): Map<string, string[][]> {
    const identifiers = new Map<string, Map<string, string[]>>();
    const add = (entitySet: string, names: ReadonlyArray<string>): void => {
        const sorted = [...names].sort();
        const byName = identifiers.get(entitySet) ?? new Map<string, string[]>();
        byName.set(sorted.join('\u0000'), sorted);
        identifiers.set(entitySet, byName);
    };
    const entities = new Map(input.graph.entities.map((entity) => [entity.entitySetName, entity]));
    for (const entity of input.graph.entities) {
        entity.alternateKeys?.forEach((names) => add(entity.entitySetName, names));
    }
    for (const relationship of input.graph.relationships) {
        const target = entities.get(relationship.toEntitySet);
        const names = relationship.mappings.map(({ targetProperty }) => targetProperty);
        const keys = target?.properties.filter(({ isKey }) => isKey) ?? [];
        if (
            target &&
            relationship.provenance === 'explicit' &&
            relationship.targetCardinality !== 'many' &&
            names.length > 0 &&
            names.every((name) => target.properties.some((property) => property.name === name)) &&
            !keys.every(({ name }) => names.includes(name))
        ) {
            add(target.entitySetName, names);
        }
    }
    return new Map([...identifiers].map(([entitySet, byName]) => [entitySet, [...byName.values()]]));
}

/**
 * An alternate key, and the properties a declared to-one reference selects its target row by, identify one
 * row: no generated row shares their values with another row of the set, supplied or generated.
 *
 * @param input check input
 * @returns findings per identifier, on its first property
 */
export function checkIdentifiers(input: RealismInput): CheckOutcome {
    const collector = new OutcomeCollector(REALISM_CHECK.identifierUnique);
    for (const [entitySet, identifiers] of declaredIdentifiers(input)) {
        for (const names of identifiers) {
            collector.field({ entitySet, property: names[0], ...repeatedIdentifiers(input, entitySet, names) });
        }
    }
    return collector.outcome();
}
