import type { SchemaGraph } from '../schema/graph.js';
import type { ExistingMockData, MockDataGeneratorDiagnostic, MockDataRow } from '../types.js';

/**
 * The rows the caller supplied for one entity set, in order.
 *
 * @param ownership - Existing data for the entity set.
 * @returns The supplied rows, or none.
 */
export function authoredRows(ownership: ExistingMockData | undefined): ReadonlyArray<MockDataRow> {
    const initial = ownership?.initialRows;
    return initial?.present && 'rows' in initial ? initial.rows : [];
}

/**
 * Entity sets that a value list reads: their supplied rows are the whole domain.
 *
 * @param graph - Service schema.
 * @returns The value-list collections.
 */
function valueListDomains(graph: SchemaGraph): ReadonlySet<string> {
    return new Set(
        graph.entities.flatMap((entity) =>
            entity.properties.flatMap(({ links }) => (links?.valueListCollection ? [links.valueListCollection] : []))
        )
    );
}

/**
 * The rows an entity set publishes, for resolving references to it while generating: the supplied
 * rows alone for a value-list domain, and otherwise the supplied rows followed by the generated rows
 * that do not repeat a supplied key — the same rows `preserveAuthoredRows` publishes.
 *
 * @param graph - Service schema.
 * @param resource - Entity set.
 * @param resources - Generated rows by entity set.
 * @param existingData - Rows the caller supplied, by entity set.
 * @returns The rows references to the entity set resolve against.
 */
export function publishedRows(
    graph: SchemaGraph,
    resource: string,
    resources: Readonly<Record<string, ReadonlyArray<MockDataRow>>>,
    existingData: Readonly<Record<string, ExistingMockData>>
): ReadonlyArray<MockDataRow> {
    const supplied = authoredRows(existingData[resource]);
    const generated = resources[resource] ?? [];
    if (supplied.length === 0) {
        return generated;
    }
    if (valueListDomains(graph).has(resource)) {
        return supplied;
    }
    const keys = graph.entities
        .find(({ entitySetName }) => entitySetName === resource)
        ?.properties.filter(({ isKey }) => isKey);
    const merged = supplied.map((row, index) => ({ ...(generated[index] ?? {}), ...row }));
    if (!keys || keys.length === 0) {
        return [...merged, ...generated.slice(supplied.length)];
    }
    const signature = (row: MockDataRow): string => JSON.stringify(keys.map(({ name }) => row[name]));
    const suppliedKeys = new Set(merged.map(signature));
    // Generated rows fill the set up to its generated size; one that repeats a supplied key is
    // represented by the supplied row, so the next generated row takes its place.
    const additional = generated
        .filter((row) => !suppliedKeys.has(signature(row)))
        .slice(0, Math.max(0, generated.length - supplied.length));
    return [...merged, ...additional];
}

/**
 * Keep authored target rows and finite value-help domains authoritative in the new snapshot.
 *
 * @param graph
 * @param resources
 * @param existingData
 * @param diagnostics
 */
export function preserveAuthoredRows(
    graph: SchemaGraph,
    resources: Readonly<Record<string, ReadonlyArray<MockDataRow>>>,
    existingData: Readonly<Record<string, ExistingMockData>>,
    diagnostics: MockDataGeneratorDiagnostic[]
): Readonly<Record<string, ReadonlyArray<MockDataRow>>> {
    const referencedDomains = valueListDomains(graph);
    const entities = new Map(graph.entities.map((entity) => [entity.entitySetName, entity]));
    const output: Record<string, ReadonlyArray<MockDataRow>> = { ...resources };
    for (const [resource, generated] of Object.entries(resources)) {
        const authored = authoredRows(existingData[resource]);
        if (authored.length === 0) {
            continue;
        }
        const entity = entities.get(resource);
        if (!entity) {
            throw new TypeError(`Authored resource ${resource} is not declared by the service schema`);
        }
        if (authored.length > 1_000) {
            throw new TypeError(`Authored resource ${resource} exceeds the maximum row count`);
        }
        const finiteDomain = referencedDomains.has(resource);
        if (finiteDomain && authored.some((row) => entity.properties.some(({ name }) => !Object.hasOwn(row, name)))) {
            throw new TypeError(`SEMANTIC_AUTHORED_DOMAIN_INCOMPLETE: ${resource}`);
        }
        if (
            !finiteDomain &&
            authored.length > generated.length &&
            authored.some((row) => entity.properties.some(({ name }) => !Object.hasOwn(row, name)))
        ) {
            throw new TypeError(`SEMANTIC_AUTHORED_ROW_INCOMPLETE: ${resource}`);
        }
        const merged = authored.map((row, index) => Object.freeze({ ...(generated[index] ?? {}), ...row }));
        const keys = entity.properties.filter(({ isKey }) => isKey);
        const signature = (row: MockDataRow): string => JSON.stringify(keys.map(({ name }) => row[name]));
        if (keys.length > 0 && new Set(merged.map(signature)).size !== merged.length) {
            // Two supplied rows share a key: the caller's own file is inconsistent.
            throw new TypeError(
                `SEMANTIC_AUTHORED_KEY_COLLISION: ${resource}: the existing mock data for ${resource} has rows with the same key; correct or remove them and generate again`
            );
        }
        // The same rows that references resolve against while generating: a generated row that
        // repeats a supplied key is represented by the supplied row.
        const rows = finiteDomain
            ? merged
            : publishedRows(graph, resource, resources, existingData).map((row) => Object.freeze({ ...row }));
        if (!finiteDomain && rows.length < generated.length) {
            diagnostics.push({
                code: 'ROW_COUNT_REDUCED_AUTHORED_DOMAIN',
                severity: 'info',
                target: resource,
                message:
                    'Generated rows that repeated a supplied row key were left out; the supplied rows stand for them.'
            });
        }
        if (finiteDomain && rows.length < generated.length) {
            diagnostics.push({
                code: 'ROW_COUNT_REDUCED_AUTHORED_DOMAIN',
                severity: 'info',
                target: resource,
                message: 'The authored finite value-help domain has fewer rows than the requested synthetic row count.'
            });
        }
        output[resource] = Object.freeze(rows);
    }
    return Object.freeze(output);
}
