import type { SchemaEntity, SchemaGraph } from '../schema/graph.js';
import type { ExistingMockData, MockDataGeneratorDiagnostic, MockDataRow } from '../types.js';
import { MAX_ROWS_PER_ENTITY } from '../limits.js';
import { canonicalJson } from '../hash.js';
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
 * Whether generation wrote each row of an entity set: rows whose key a supplied row carries are the caller's;
 * for an entity without keys, the first rows (as many as were supplied) are, see `publishedRows`.
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
 * How many generated rows the supplied rows of an entity set stand for: one per distinct key, or one per row
 * for an entity without keys.
 *
 * @param entity - The entity.
 * @param supplied - The supplied rows of its entity set.
 * @returns The number of generated rows the supplied rows take.
 */
export function suppliedRowSlots(entity: SchemaEntity, supplied: ReadonlyArray<MockDataRow>): number {
    const keys = entity.properties.filter(({ isKey }) => isKey);
    return keys.length === 0 ? supplied.length : new Set(supplied.map((row) => keySignature(keys, row))).size;
}

/**
 * The rows generation wrote, by entity set, without the caller's supplied rows, which checks of the generated
 * rows do not hold to the plan.
 *
 * @param graph - Service schema.
 * @param resources - The published rows by entity set.
 * @param existingData - The caller's existing rows.
 * @returns The generated rows by entity set.
 */
export function generatedResources(
    graph: SchemaGraph,
    resources: Readonly<Record<string, ReadonlyArray<MockDataRow>>>,
    existingData: Readonly<Record<string, ExistingMockData>>
): Readonly<Record<string, ReadonlyArray<MockDataRow>>> {
    const entities = new Map(graph.entities.map((entity) => [entity.entitySetName, entity]));
    return Object.fromEntries(
        Object.entries(resources).map(([name, rows]) => {
            const entity = entities.get(name);
            if (!entity) {
                return [name, rows];
            }
            const generated = generatedRowFlags(entity, rows, existingData);
            return [name, rows.filter((_, index) => generated[index])];
        })
    );
}

/**
 * Entity sets that a value list reads: their supplied rows are the whole domain.
 *
 * @param graph - Service schema.
 * @returns The value-list collections.
 */
export function valueListDomains(graph: SchemaGraph): ReadonlySet<string> {
    return new Set(
        graph.entities.flatMap((entity) =>
            entity.properties.flatMap(({ links }) => (links?.valueListCollection ? [links.valueListCollection] : []))
        )
    );
}

/**
 * Value-list entity sets whose supplied rows are the whole domain for this request: every value-list
 * collection except those a per-entity-set request asks rows of.
 *
 * @param graph - Service schema of the request.
 * @returns The value-list collections that gain no rows once they have supplied rows.
 */
export function completeValueListDomains(graph: SchemaGraph): ReadonlySet<string> {
    const domains = valueListDomains(graph);
    const grown = graph.requestedValueListGrowth;
    return grown?.size ? new Set([...domains].filter((domain) => !grown.has(domain))) : domains;
}

/**
 * Marks the value-list entity sets a per-entity-set request asks rows of (e.g. `{ Products: 1 }`), whose
 * supplied rows are then not the whole domain. A plain number names no set and changes nothing.
 *
 * @param graph - Service schema of the request.
 * @param rowsPerEntity - Rows requested per entity set or entity type name, or for every set.
 * @returns The schema with the requested value-list sets marked, or the schema unchanged.
 */
export function withRequestedValueListGrowth(
    graph: SchemaGraph,
    rowsPerEntity: number | Readonly<Record<string, number>> | undefined
): SchemaGraph {
    if (typeof rowsPerEntity !== 'object') {
        return graph;
    }
    const domains = valueListDomains(graph);
    const grown = graph.entities
        .filter(({ entitySetName }) => domains.has(entitySetName))
        .filter(({ entitySetName, name }) => (rowsPerEntity[entitySetName] ?? rowsPerEntity[name] ?? 0) > 0)
        .map(({ entitySetName }) => entitySetName);
    return grown.length > 0 ? { ...graph, requestedValueListGrowth: new Set(grown) } : graph;
}

/**
 * The rows an entity set publishes (as `preserveAuthoredRows` does), for resolving references while generating:
 * only the supplied rows for a value-list domain, else the supplied rows followed by generated rows that repeat
 * no identifier of a supplied row.
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
    if (completeValueListDomains(graph).has(resource)) {
        return supplied;
    }
    const entity = graph.entities.find(({ entitySetName }) => entitySetName === resource);
    const keys = entity?.properties.filter(({ isKey }) => isKey) ?? [];
    if (!entity || keys.length === 0) {
        return [...supplied, ...generated.slice(supplied.length)];
    }
    const identifiers = [
        keys.map(({ name }) => name),
        ...(entity.semanticKey ? [entity.semanticKey] : []),
        ...(entity.alternateKeys ?? [])
    ];
    const signatures = (row: MockDataRow): string[] =>
        identifiers.flatMap((names, index) => {
            const values = names.map((name) => row[name]);
            return values.every((value) => value != null && value !== '') ? [`${index}:${JSON.stringify(values)}`] : [];
        });
    const suppliedIdentifiers = new Set(supplied.flatMap(signatures));
    // A supplied row without a complete key, already published by an earlier pass, is recognised by its content.
    const suppliedContents = new Set(
        supplied.filter((row) => !signatures(row).some((signature) => signature.startsWith('0:'))).map(canonicalJson)
    );
    // Generated rows fill the generated size less the supplied keys' slots; one repeating an identifier (key,
    // semantic key or alternate key) of a supplied row would merge two rows, so the next takes its place.
    const additional = generated
        .filter(
            (row) =>
                (suppliedContents.size === 0 || !suppliedContents.has(canonicalJson(row))) &&
                !signatures(row).some((signature) => suppliedIdentifiers.has(signature))
        )
        .slice(0, Math.max(0, generated.length - suppliedRowSlots(entity, supplied)));
    return [...supplied, ...additional];
}

/**
 * The schema entity of an authored resource, after checking the supplied rows can stand: the resource is
 * declared, holds at most the maximum row count and, as a finite value-help domain, gives every field.
 *
 * @param resource the authored resource
 * @param entity its schema entity, if the schema declares it
 * @param authored the supplied rows
 * @param finiteDomain whether the rows are the whole domain of a value help
 * @returns the entity
 */
function authoredEntity(
    resource: string,
    entity: SchemaEntity | undefined,
    authored: ReadonlyArray<MockDataRow>,
    finiteDomain: boolean
): SchemaEntity {
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
    if (finiteDomain && authored.some((row) => entity.properties.some(({ name }) => !Object.hasOwn(row, name)))) {
        throw new MockGenError(MOCKGEN_ERROR_CODE.REQUEST_INVALID, `SEMANTIC_AUTHORED_DOMAIN_INCOMPLETE: ${resource}`);
    }
    return entity;
}

/**
 * Warn when two supplied rows share a key; they are still published as written.
 *
 * @param entity the schema entity of the rows
 * @param resource the authored resource
 * @param rows the supplied rows
 * @param diagnostics receives the warning
 */
function reportDuplicatedSuppliedKeys(
    entity: SchemaEntity,
    resource: string,
    rows: ReadonlyArray<MockDataRow>,
    diagnostics: MockDataGeneratorDiagnostic[]
): void {
    const keys = entity.properties.filter(({ isKey }) => isKey);
    const signature = (row: MockDataRow): string => keySignature(keys, row);
    if (keys.length > 0 && new Set(rows.map(signature)).size !== rows.length) {
        diagnostics.push({
            code: 'SUPPLIED_KEY_DUPLICATED',
            severity: 'warning',
            target: resource,
            message: 'Supplied rows share a key; they are published as written, and a key read returns the first.'
        });
    }
}

/**
 * Keep authored target rows and finite value-help domains authoritative in the new snapshot.
 *
 * @param graph service schema
 * @param resources generated rows by entity set
 * @param existingData the caller's existing rows
 * @param diagnostics receives the row-count and duplicate-key diagnostics
 * @returns the published rows by entity set
 */
export function preserveAuthoredRows(
    graph: SchemaGraph,
    resources: Readonly<Record<string, ReadonlyArray<MockDataRow>>>,
    existingData: Readonly<Record<string, ExistingMockData>>,
    diagnostics: MockDataGeneratorDiagnostic[]
): Readonly<Record<string, ReadonlyArray<MockDataRow>>> {
    const referencedDomains = completeValueListDomains(graph);
    const entities = new Map(graph.entities.map((entity) => [entity.entitySetName, entity]));
    const output: Record<string, ReadonlyArray<MockDataRow>> = { ...resources };
    for (const [resource, generated] of Object.entries(resources)) {
        const authored = authoredRows(existingData[resource]);
        if (authored.length === 0) {
            continue;
        }
        const finiteDomain = referencedDomains.has(resource);
        const entity = authoredEntity(resource, entities.get(resource), authored, finiteDomain);
        // Supplied rows are published as the caller wrote them; a field a row leaves out stays out.
        const merged = authored.map((row) => Object.freeze({ ...row }));
        reportDuplicatedSuppliedKeys(entity, resource, merged, diagnostics);
        // The same rows references resolved against while generating.
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
        if (finiteDomain) {
            // The supplied rows are the whole domain; no requested rows are appended.
            diagnostics.push({
                code: 'ROW_COUNT_REDUCED_AUTHORED_DOMAIN',
                severity: 'info',
                target: resource,
                message: 'The supplied rows of this value help are its whole domain; no requested rows were added.'
            });
        }
        output[resource] = Object.freeze(rows);
    }
    return Object.freeze(output);
}
