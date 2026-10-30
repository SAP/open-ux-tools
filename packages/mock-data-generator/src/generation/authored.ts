import type { SchemaEntity, SchemaGraph } from '../schema/graph.js';
import type { ExistingMockData, MockDataGeneratorDiagnostic, MockDataRow } from '../types.js';
import { MAX_ROWS_PER_ENTITY } from '../limits.js';
import { keySignature } from './rows.js';
import { MOCKGEN_ERROR_CODE, MockGenError } from '../errors.js';

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
 * Whether generation wrote each row of an entity set: rows whose key a supplied row carries are the caller's.
 * An entity without keys publishes its supplied rows first, in order (see `publishedRows`), so its first rows,
 * as many as were supplied, are the caller's.
 *
 * @param entity the entity
 * @param rows its rows
 * @param existingData the caller's existing rows
 * @returns per row, true when generated
 */
export function generatedRowFlags(
    entity: SchemaEntity,
    rows: ReadonlyArray<MockDataRow>,
    existingData: Readonly<Record<string, ExistingMockData>>
): boolean[] {
    const keys = entity.properties.filter(({ isKey }) => isKey);
    const authored = authoredRows(existingData[entity.entitySetName]);
    if (keys.length === 0) {
        return rows.map((_, index) => index >= authored.length);
    }
    const supplied = new Set(authored.map((row) => keySignature(keys, row)));
    return rows.map((row) => !supplied.has(keySignature(keys, row)));
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
    const signature = (row: MockDataRow): string => keySignature(keys, row);
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
            throw new MockGenError(
                MOCKGEN_ERROR_CODE.REQUEST_INVALID,
                `Authored resource ${resource} is not declared by the service schema`
            );
        }
        if (authored.length > MAX_ROWS_PER_ENTITY) {
            throw new MockGenError(
                MOCKGEN_ERROR_CODE.REQUEST_INVALID,
                `Authored resource ${resource} exceeds the maximum row count`
            );
        }
        const finiteDomain = referencedDomains.has(resource);
        if (finiteDomain && authored.some((row) => entity.properties.some(({ name }) => !Object.hasOwn(row, name)))) {
            throw new MockGenError(
                MOCKGEN_ERROR_CODE.REQUEST_INVALID,
                `SEMANTIC_AUTHORED_DOMAIN_INCOMPLETE: ${resource}`
            );
        }
        if (
            !finiteDomain &&
            authored.length > generated.length &&
            authored.some((row) => entity.properties.some(({ name }) => !Object.hasOwn(row, name)))
        ) {
            throw new MockGenError(MOCKGEN_ERROR_CODE.REQUEST_INVALID, `SEMANTIC_AUTHORED_ROW_INCOMPLETE: ${resource}`);
        }
        const merged = authored.map((row, index) => Object.freeze({ ...(generated[index] ?? {}), ...row }));
        const keys = entity.properties.filter(({ isKey }) => isKey);
        const signature = (row: MockDataRow): string => keySignature(keys, row);
        if (keys.length > 0 && new Set(merged.map(signature)).size !== merged.length) {
            // Two supplied rows share a key: the caller's own file is inconsistent.
            throw new MockGenError(
                MOCKGEN_ERROR_CODE.REQUEST_INVALID,
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
