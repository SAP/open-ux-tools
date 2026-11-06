import type { SchemaContainment, SchemaEntity, SchemaGraph } from '../schema/graph.js';
import type {
    ExistingMockData,
    JsonValue,
    MockDataGeneratorDiagnostic,
    MockDataRow,
    MockDataTarget
} from '../types.js';
import { generatedRowFlags } from './authored.js';
import { keySignature } from './rows.js';

type Resources = Readonly<Record<string, ReadonlyArray<MockDataRow>>>;

/**
 * The contained entities of a graph, each after the entity that contains it.
 *
 * @param graph - Service schema.
 * @returns The contained entities, shallowest first.
 */
function containedEntities(graph: SchemaGraph): SchemaEntity[] {
    const depth = (entity: SchemaEntity): number => entity.entitySetName.split('/').length;
    return graph.entities.filter(({ containedBy }) => containedBy !== undefined).sort((a, b) => depth(a) - depth(b));
}

/**
 * The contained entities generated with the requested targets: those a requested entity set contains, at any
 * depth. Their rows are generated as entities of their own and published inside the rows that contain them.
 *
 * @param graph - Service schema.
 * @param targets - The requested targets that can be generated.
 * @returns The contained targets, shallowest first.
 */
export function containedTargets(graph: SchemaGraph, targets: ReadonlyArray<MockDataTarget>): MockDataTarget[] {
    const generated = new Set(targets.map(({ name }) => name));
    const contained: MockDataTarget[] = [];
    for (const { entitySetName, containedBy } of containedEntities(graph)) {
        if (containedBy && generated.has(containedBy.entitySetName)) {
            generated.add(entitySetName);
            contained.push({ name: entitySetName, kind: 'entity-set' });
        }
    }
    return contained;
}

/** The properties a contained row copies from its container, and whether a declared constraint links them. */
interface ContainerMappings {
    readonly mappings: ReadonlyArray<Readonly<{ sourceProperty: string; targetProperty: string }>>;
    /** True when the contained type references its container: its rows say which container holds them. */
    readonly declared: boolean;
}

/**
 * The properties a contained row copies from its container, matched as the SAP Fiori elements mockserver does: by the
 * referential constraints towards the container, else by key names both types declare.
 *
 * @param graph - Service schema.
 * @param entity - The contained entity.
 * @param container - The entity that contains it.
 * @returns The child property and the container property it copies, and whether a constraint declares them.
 */
function containerMappings(graph: SchemaGraph, entity: SchemaEntity, container: SchemaEntity): ContainerMappings {
    const declared = graph.relationships
        .filter(
            ({ fromEntitySet, toEntitySet }) =>
                fromEntitySet === entity.entitySetName && toEntitySet === container.entitySetName
        )
        .flatMap(({ mappings }) => mappings);
    if (declared.length > 0) {
        return { mappings: declared, declared: true };
    }
    const sameNamed = (keys: SchemaEntity, other: SchemaEntity): string[] =>
        keys.properties
            .filter(({ isKey, name }) => isKey && other.properties.some((property) => property.name === name))
            .map(({ name }) => name);
    const childKeys = sameNamed(entity, container);
    const names = childKeys.length > 0 ? childKeys : sameNamed(container, entity);
    return { mappings: names.map((name) => ({ sourceProperty: name, targetProperty: name })), declared: false };
}

/**
 * Publish the rows of contained entities inside the generated rows that contain them, as the SAP Fiori elements
 * mockserver reads them. Every container holds one row before any holds two; supplied rows are published as supplied,
 * and unplaced rows or empty containers are reported.
 *
 * @param graph - Service schema.
 * @param resources - Generated rows by entity set, contained entities included.
 * @param existingData - The caller's existing rows.
 * @param diagnostics - Receives the reductions.
 * @returns The rows by entity set, contained entities nested in their containers.
 */
export function nestContainedRows(
    graph: SchemaGraph,
    resources: Resources,
    existingData: Readonly<Record<string, ExistingMockData>>,
    diagnostics: MockDataGeneratorDiagnostic[]
): Resources {
    const nested: Record<string, MockDataRow[]> = Object.fromEntries(
        Object.entries(resources).map(([name, rows]) => [name, [...rows]])
    );
    const entities = new Map(graph.entities.map((entity) => [entity.entitySetName, entity]));
    // Container index to the indexes of the rows it holds, by contained entity.
    const holdings = new Map<string, Map<number, number[]>>();
    for (const entity of containedEntities(graph)) {
        const rows = nested[entity.entitySetName];
        const container = entity.containedBy ? entities.get(entity.containedBy.entitySetName) : undefined;
        if (!rows || !container) {
            continue;
        }
        const containers = nested[container.entitySetName] ?? [];
        const generated = generatedRowFlags(container, containers, existingData);
        const slots = containers.flatMap((_, index) => (generated[index] ? [index] : []));
        const placed = placeContainedRows(entity, containerMappings(graph, entity, container), rows, containers, slots);
        const ordered: MockDataRow[] = [];
        const held = new Map<number, number[]>();
        for (const index of [...placed.groups.keys()].sort((a, b) => a - b)) {
            const children = placed.groups.get(index) ?? [];
            held.set(
                index,
                children.map((_, offset) => ordered.length + offset)
            );
            ordered.push(...children);
        }
        nested[entity.entitySetName] = ordered;
        holdings.set(entity.entitySetName, held);
        reportPlacement(entity.entitySetName, rows.length, slots.length, placed, diagnostics);
    }
    for (const entity of containedEntities(graph).reverse()) {
        const containment = entity.containedBy;
        const held = holdings.get(entity.entitySetName);
        const rows = nested[entity.entitySetName];
        const containers = containment ? nested[containment.entitySetName] : undefined;
        if (!containment || !held || !rows || !containers) {
            continue;
        }
        for (const [index, children] of held) {
            containers[index] = {
                ...containers[index],
                [containment.navigation]: children.map((child) => rows[child])
            };
        }
        delete nested[entity.entitySetName];
    }
    return nested;
}

/**
 * Report contained rows no container could hold and generated containers left without one.
 *
 * @param target - The contained entity.
 * @param rowCount - Its rows before placement.
 * @param containerCount - The generated container rows.
 * @param placed - The placement.
 * @param placed.groups - The rows each container index holds.
 * @param placed.unplaced - The rows no container could hold.
 * @param diagnostics - Receives the reports.
 */
function reportPlacement(
    target: string,
    rowCount: number,
    containerCount: number,
    placed: { groups: ReadonlyMap<number, ReadonlyArray<MockDataRow>>; unplaced: number },
    diagnostics: MockDataGeneratorDiagnostic[]
): void {
    if (placed.unplaced > 0) {
        diagnostics.push({
            code: 'ROW_COUNT_REDUCED_CONTAINER_LIMIT',
            severity: 'warning',
            target,
            message: `${placed.unplaced} of ${rowCount} contained rows found no generated container row to hold them.`
        });
    }
    const empty = containerCount - placed.groups.size;
    if (empty > 0) {
        diagnostics.push({
            code: 'CONTAINED_ROWS_FEWER_THAN_CONTAINERS',
            severity: 'info',
            target,
            message: `${empty} of ${containerCount} generated container rows hold no contained row.`
        });
    }
}

/**
 * Assign contained rows to the generated container rows that hold them.
 *
 * @param entity - The contained entity.
 * @param link - The properties a contained row copies from its container.
 * @param rows - Its rows.
 * @param containers - The container rows.
 * @param slots - Indexes of the generated container rows.
 * @returns The rows each container index holds, with the values they copy, and how many rows none could hold.
 */
function placeContainedRows(
    entity: SchemaEntity,
    link: ContainerMappings,
    rows: ReadonlyArray<MockDataRow>,
    containers: ReadonlyArray<MockDataRow>,
    slots: ReadonlyArray<number>
): { groups: Map<number, MockDataRow[]>; unplaced: number } {
    const { mappings } = link;
    const isCollection = entity.containedBy?.isCollection === true;
    const keys = entity.properties.filter(({ isKey }) => isKey);
    const groups = new Map<number, MockDataRow[]>();
    const signatures = new Map<number, Set<string>>();
    const withContainerValues = (row: MockDataRow, index: number): MockDataRow => ({
        ...row,
        ...Object.fromEntries(
            mappings.map(({ sourceProperty, targetProperty }): [string, JsonValue] => [
                sourceProperty,
                containers[index][targetProperty] ?? null
            ])
        )
    });
    const place = (row: MockDataRow, index: number): boolean => {
        const held = groups.get(index) ?? [];
        const child = withContainerValues(row, index);
        const signature = keySignature(keys, child);
        const seen = signatures.get(index) ?? new Set<string>();
        if ((!isCollection && held.length > 0) || (keys.length > 0 && seen.has(signature))) {
            return false;
        }
        groups.set(index, [...held, child]);
        signatures.set(index, seen.add(signature));
        return true;
    };
    // Only a declared reference says which container holds a row; values shared by name say nothing of it.
    const referenced = (row: MockDataRow): number | undefined =>
        link.declared
            ? slots.find((index) =>
                  mappings.every(
                      ({ sourceProperty, targetProperty }) => containers[index][targetProperty] === row[sourceProperty]
                  )
              )
            : undefined;
    const pending = rows.filter((row) => {
        const index = referenced(row);
        return index === undefined || !place(row, index);
    });
    let unplaced = 0;
    for (const row of pending) {
        const candidates = [...slots].sort((a, b) => (groups.get(a)?.length ?? 0) - (groups.get(b)?.length ?? 0));
        if (!candidates.some((index) => place(row, index))) {
            unplaced += 1;
        }
    }
    return { groups, unplaced };
}

/**
 * Read the contained rows back out of the generated rows that hold them, shallowest first: the inverse of
 * `nestContainedRows`, so a published result can be checked entity by entity. The containment navigation is
 * removed from each generated container row; a supplied row keeps what it holds.
 *
 * @param graph - Service schema.
 * @param resources - Published rows by entity set.
 * @param existingData - The caller's existing rows.
 * @returns The rows by entity set, contained entities as entities of their own.
 * @throws {TypeError} when a generated container row holds something other than rows under a containment navigation
 */
export function flattenContainedRows(
    graph: SchemaGraph,
    resources: Resources,
    existingData: Readonly<Record<string, ExistingMockData>>
): Resources {
    const flat: Record<string, MockDataRow[]> = Object.fromEntries(
        Object.entries(resources).map(([name, rows]) => [name, [...rows]])
    );
    const entities = new Map(graph.entities.map((entity) => [entity.entitySetName, entity]));
    for (const entity of containedEntities(graph)) {
        const containment = entity.containedBy;
        const container = containment ? entities.get(containment.entitySetName) : undefined;
        const containers = container ? flat[container.entitySetName] : undefined;
        if (!containment || !container || !containers) {
            continue;
        }
        const generated = generatedRowFlags(container, containers, existingData);
        const rows: MockDataRow[] = [];
        for (const [index, row] of containers.entries()) {
            if (generated[index] && Object.hasOwn(row, containment.navigation)) {
                const { [containment.navigation]: held, ...rest } = row;
                rows.push(...heldRows(container.entitySetName, containment, held));
                containers[index] = rest;
            }
        }
        flat[entity.entitySetName] = rows;
    }
    return flat;
}

/**
 * The rows a container row holds under a containment navigation.
 *
 * @param containerName - The container's entity set.
 * @param containment - The containment.
 * @param held - The value under the navigation.
 * @returns The contained rows.
 * @throws {TypeError} when the value is not a list of rows, of at most one row for a to-one containment
 */
function heldRows(containerName: string, containment: SchemaContainment, held: JsonValue): MockDataRow[] {
    if (!Array.isArray(held) || !held.every(isRow) || (!containment.isCollection && held.length > 1)) {
        throw new TypeError(
            `Generated resource ${containerName} holds invalid contained rows under ${containment.navigation}`
        );
    }
    return held;
}

/**
 * Whether a contained value is a row.
 *
 * @param value - The value.
 * @returns true for a JSON object
 */
function isRow(value: JsonValue): value is MockDataRow {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
