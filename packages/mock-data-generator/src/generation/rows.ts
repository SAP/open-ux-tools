import type { SchemaEntity, SchemaGraph, SchemaProperty } from '../schema/graph.js';
import type {
    ExistingInitialRows,
    ExistingMockData,
    JsonValue,
    MockDataGeneratorDiagnostic,
    MockDataRow
} from '../types.js';

/**
 * Row helpers shared by the generation stages: value and key comparison, the two notions of caller-owned
 * data, protected fields, freezing and diagnostic de-duplication.
 */

/**
 * Whether two field values are the same JSON value. Objects and arrays compare by their JSON text, so
 * key order inside an object value matters.
 *
 * @param left first value
 * @param right second value
 * @returns true when both are the same value
 * @example
 * sameValue(1, 1); // true
 * sameValue([1, 2], [1, 2]); // true
 */
export function sameValue(left: JsonValue | undefined, right: JsonValue | undefined): boolean {
    return Object.is(left, right) || JSON.stringify(left) === JSON.stringify(right);
}

/**
 * The identity of a row under an entity's key: the JSON text of its key values in key order. Two rows
 * with the same signature collide on the key. A missing key value renders as `null`.
 *
 * @param keys the key properties, in declaration order
 * @param row the row
 * @returns the key signature
 * @example
 * keySignature([{ name: 'ID' }, { name: 'Version' }], { ID: 'A', Version: 1 }); // '["A",1]'
 */
export function keySignature(
    keys: ReadonlyArray<Pick<SchemaProperty, 'name'>>,
    row: Readonly<Record<string, JsonValue | undefined>>
): string {
    return JSON.stringify(keys.map(({ name }) => row[name]));
}

/** Initial rows the caller supplied in full: a JSON file, or a contributor that can enumerate its rows. */
export type AuthoritativeInitialRows = Extract<ExistingInitialRows, { rows: ReadonlyArray<MockDataRow> }>;

/**
 * Whether the caller's initial rows for an entity set are authoritative: present and enumerable, so they
 * are the complete published domain of that set. Generation reads them as the rows references resolve
 * against and never rewrites them. A contributor that cannot enumerate its rows is not authoritative.
 *
 * @param initialRows the caller's initial rows for one entity set
 * @returns true when the rows are present and enumerable
 */
export function hasAuthoritativeRows(
    initialRows: ExistingInitialRows | undefined
): initialRows is AuthoritativeInitialRows {
    return initialRows?.present === true && (initialRows.source === 'json' || initialRows.enumerable);
}

/**
 * Whether the caller owns data for an entity set: it supplied at least one row, or a contributor declares
 * initial data (enumerable or not). Unlike {@link hasAuthoritativeRows} this also counts contributors whose
 * rows cannot be read, and does not count an empty supplied file. The model tier uses it to never invent
 * a domain for an entity set the application already fills.
 *
 * @param existing the caller's existing data for one entity set
 * @returns true when the caller owns data for the set
 */
export function ownsInitialData(existing: ExistingMockData | undefined): boolean {
    return (
        (existing?.initialRows.present === true &&
            'rows' in existing.initialRows &&
            existing.initialRows.rows.length > 0) ||
        (existing?.contributor.present === true && existing.contributor.hasInitialData)
    );
}

/**
 * Whether a property is a key or declares an enumeration (even an empty one). With
 * {@link isRelationshipEnd}, this is the definition of a field that format providers and tuple projection
 * must not rewrite.
 *
 * @param property the property
 * @returns true for a key or an enumeration-typed property
 */
function isKeyOrDeclaredEnumeration(property: SchemaProperty): boolean {
    return property.isKey || property.enumValues !== undefined;
}

/**
 * Whether a property is a key or has a non-empty enumeration: the fields whose values coherence rules and
 * temporal repair keep. An enumeration without members imposes no domain, so, unlike
 * {@link isProtectedProperty}, it does not fix the field here.
 *
 * @param property the property
 * @returns true for a key or a property with enumeration members
 */
export function isKeyOrEnumerated(property: SchemaProperty): boolean {
    return property.isKey || Boolean(property.enumValues?.length);
}

/**
 * Whether a property is either end of a relationship mapping of its entity.
 *
 * @param graph the schema graph
 * @param entity the entity owning the property
 * @param propertyName the property name
 * @returns true when a relationship maps the property
 */
function isRelationshipEnd(graph: SchemaGraph, entity: SchemaEntity, propertyName: string): boolean {
    return graph.relationships.some((relationship) =>
        relationship.mappings.some(
            ({ sourceProperty, targetProperty }) =>
                (relationship.fromEntitySet === entity.entitySetName && sourceProperty === propertyName) ||
                (relationship.toEntitySet === entity.entitySetName && targetProperty === propertyName)
        )
    );
}

/**
 * Whether a field is protected from rewriting by format providers and value-list projection: a key, a
 * declared enumeration, or either end of a relationship mapping.
 *
 * @param graph the schema graph
 * @param entity the entity owning the field
 * @param property the field
 * @returns true when the field must keep its value
 */
export function isProtectedProperty(graph: SchemaGraph, entity: SchemaEntity, property: SchemaProperty): boolean {
    return isKeyOrDeclaredEnumeration(property) || isRelationshipEnd(graph, entity, property.name);
}

/**
 * The names of an entity's protected fields as {@link isProtectedProperty} defines them, computed in one
 * pass over the relationships for callers that test many fields.
 *
 * @param graph the schema graph
 * @param entity the entity
 * @returns the protected property names, including every relationship mapping end of the entity
 */
export function protectedPropertyNames(graph: SchemaGraph, entity: SchemaEntity): Set<string> {
    const names = relationshipEndNames(graph, entity);
    entity.properties.filter(isKeyOrDeclaredEnumeration).forEach(({ name }) => names.add(name));
    return names;
}

/**
 * The names of an entity's properties that either end of a relationship mapping names.
 *
 * @param graph the schema graph
 * @param entity the entity
 * @returns the relationship mapping ends of the entity
 */
export function relationshipEndNames(graph: SchemaGraph, entity: SchemaEntity): Set<string> {
    const names = new Set<string>();
    for (const relationship of graph.relationships) {
        if (relationship.fromEntitySet === entity.entitySetName) {
            relationship.mappings.forEach(({ sourceProperty }) => names.add(sourceProperty));
        }
        if (relationship.toEntitySet === entity.entitySetName) {
            relationship.mappings.forEach(({ targetProperty }) => names.add(targetProperty));
        }
    }
    return names;
}

/**
 * Freeze a list of rows and each row in it. The freeze is two levels deep on purpose: field values are
 * JSON scalars or are never mutated after generation, and a deeper freeze would cost a full walk.
 *
 * @param rows the rows
 * @returns the same rows, frozen, in a frozen array
 */
export function freezeRows<Row extends object>(rows: ReadonlyArray<Row>): ReadonlyArray<Readonly<Row>> {
    return Object.freeze(rows.map((row) => Object.freeze(row)));
}

/**
 * Append a diagnostic unless one with the same code and target was already reported, so a condition
 * found once per row is reported once per field.
 *
 * @param diagnostics the diagnostics so far, in report order
 * @param diagnostic the diagnostic to report
 */
export function pushUniqueDiagnostic(
    diagnostics: MockDataGeneratorDiagnostic[],
    diagnostic: MockDataGeneratorDiagnostic
): void {
    if (!diagnostics.some(({ code, target }) => code === diagnostic.code && target === diagnostic.target)) {
        diagnostics.push(diagnostic);
    }
}
