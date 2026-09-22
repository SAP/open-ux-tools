import type {
    ExistingMockData,
    JsonValue,
    MockDataRow,
    SemanticClassification,
    MockDataGeneratorDiagnostic,
    SyntheticCoherenceRule
} from '../types.js';
import type {
    SchemaEntity,
    SchemaGraph,
    SchemaProperty,
    SchemaRelationship,
    SchemaValueListParameter
} from '../schema/graph.js';
import { applySemanticCoherence } from './coherence.js';
import { propertyValueIsValid } from './constraints.js';
import { generationRelationships } from './deterministic.js';
import { publishedRows } from './authored.js';
import { semanticPropertyKey } from '../semantics/classifier.js';
import { semanticRoleDefinition } from '../semantics/role-registry.js';
import { semanticValueIsValid } from './semantic-plan.js';
import {
    effectiveValueListParameters,
    memberValue,
    resolveValueListContext,
    tupleProtectedProperties,
    valueListTupleMembers
} from './value-list-context.js';
import type { ValueListTupleMember } from './value-list-context.js';
import { sharingComponent, solveTupleChoice } from './tuple-solver.js';
import { inferredCoherenceRules, reconcileTemporalPlan } from './temporal-plan.js';
import type { TemporalConstraint } from './temporal-plan.js';

const MAX_GENERATED_VALUE_LIST_ROWS = 1_000;

/**
 * Recomputes format-provider companions (currency, country and code-list columns) of every row
 * from its codes; returns rows in the same order.
 */
export type CompanionRefresh = (
    resources: Readonly<Record<string, ReadonlyArray<MockDataRow>>>
) => Readonly<Record<string, ReadonlyArray<MockDataRow>>>;

function singular(token: string): string {
    if (token === 'has') {
        return token;
    }
    if (token === 'children') {
        return 'child';
    }
    if (token.endsWith('ies') && token.length > 3) {
        return `${token.slice(0, -3)}y`;
    }
    return token.endsWith('s') && !token.endsWith('ss') && token.length > 1 ? token.slice(0, -1) : token;
}

function rawTokens(value: string): ReadonlyArray<string> {
    return value
        .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
        .replace(/([a-z\d])([A-Z])/g, '$1 $2')
        .replace(/[_-]+/g, ' ')
        .toLowerCase()
        .split(/\s+/u)
        .filter(Boolean)
        .map(singular);
}

function tokens(value: string): ReadonlySet<string> {
    return new Set(rawTokens(value).filter((token) => !['number', 'count', 'of', 'has', 'is'].includes(token)));
}

function sameValue(left: JsonValue | undefined, right: JsonValue | undefined): boolean {
    return Object.is(left, right) || JSON.stringify(left) === JSON.stringify(right);
}

function authoritativeRows(
    graph: SchemaGraph,
    resource: string,
    resources: Readonly<Record<string, ReadonlyArray<MockDataRow>>>,
    existingData: Readonly<Record<string, ExistingMockData>>
): ReadonlyArray<MockDataRow> {
    const initialRows = existingData[resource]?.initialRows;
    if (initialRows?.present && (initialRows.source === 'json' || initialRows.enumerable)) {
        return publishedRows(graph, resource, resources, existingData);
    }
    return resources[resource] ?? [];
}

function extendGeneratedValueListDomain(
    ownerRows: ReadonlyArray<MockDataRow>,
    domain: Array<Record<string, JsonValue>>,
    targetEntity: SchemaEntity,
    parameters: ReadonlyArray<SchemaValueListParameter>,
    ownerProperties: ReadonlyMap<string, SchemaProperty>,
    isProtected: (property: SchemaProperty) => boolean,
    classifications: ReadonlyMap<string, SemanticClassification>,
    maxRows: number,
    relevanceVerifiedDomain: boolean,
    preservesRelationships: (row: MockDataRow) => boolean,
    reportConflict: () => void
): boolean {
    const targetProperties = new Map(targetEntity.properties.map((property) => [property.name, property]));
    const assignments = parameters.filter(({ direction, localProperty, valueListProperty }) => {
        if (
            (direction !== 'In' && direction !== 'InOut') ||
            localProperty === undefined ||
            valueListProperty === undefined
        ) {
            return false;
        }
        const local = ownerProperties.get(localProperty);
        return local !== undefined && isProtected(local) && targetProperties.has(valueListProperty);
    });
    if (assignments.length === 0 || domain.length === 0) {
        return false;
    }
    const keys = targetEntity.properties.filter(({ isKey }) => isKey);
    const signature = (row: MockDataRow): string => JSON.stringify(keys.map(({ name }) => row[name]));
    const signatures = new Set(domain.map(signature));
    let changed = false;
    for (const [rowIndex, ownerRow] of ownerRows.entries()) {
        const values = assignments.map(({ localProperty, valueListProperty }) => ({
            property: valueListProperty as string,
            value: ownerRow[localProperty as string]
        }));
        if (
            values.some(({ property, value }) => {
                const targetProperty = targetProperties.get(property);
                return (
                    value === undefined || targetProperty === undefined || !propertyValueIsValid(targetProperty, value)
                );
            }) ||
            domain.some((candidate) => values.every(({ property, value }) => sameValue(candidate[property], value)))
        ) {
            continue;
        }
        // A descriptive value was verified for its original code only. Reusing it
        // with a protected, previously unseen code would create an unverified pair.
        if (relevanceVerifiedDomain && values.some(({ property }) => targetProperties.get(property)?.links?.text)) {
            throw new Error(`SYNTHETIC_DOMAIN_EXTENSION_UNVERIFIED: ${targetEntity.entitySetName}`);
        }
        if (domain.length >= maxRows) {
            reportConflict();
            continue;
        }
        let added = false;
        for (let offset = 0; offset < domain.length; offset += 1) {
            const base = domain[(rowIndex + offset) % domain.length];
            const clone: Record<string, JsonValue> = { ...base };
            values.forEach(({ property, value }) => {
                clone[property] = value as JsonValue;
            });
            const semanticallyValid = targetEntity.properties.every((property) => {
                const role = classifications.get(semanticPropertyKey(targetEntity.entitySetName, property.name))?.role;
                return (
                    Object.prototype.hasOwnProperty.call(clone, property.name) &&
                    propertyValueIsValid(property, clone[property.name]) &&
                    (!role || role === 'unknown' || semanticValueIsValid(role, property, clone[property.name]))
                );
            });
            const cloneSignature = signature(clone);
            if (!signatures.has(cloneSignature) && semanticallyValid && preservesRelationships(clone)) {
                domain.push(clone);
                signatures.add(cloneSignature);
                changed = true;
                added = true;
                break;
            }
        }
        if (!added) {
            reportConflict();
        }
    }
    return changed;
}

/**
 * A projected owner field: the tuple value it holds and the value list that first bound it.
 * Only the binding value list may later change the field; any other value list sharing the field
 * must select a tuple that agrees with it.
 */
interface ProjectedBinding {
    value: JsonValue;
    owner: string;
}

/**
 * Whether the members that fill the same owner field (for example an In and an Out parameter on
 * one field) carry the same value from a value-help row.
 *
 * @param members tuple members
 * @param candidate value-help row
 * @returns true when no owner field would receive two different values
 */
function membersAgree(members: ReadonlyArray<ValueListTupleMember>, candidate: MockDataRow): boolean {
    const values = new Map<string, JsonValue | undefined>();
    return members.every((member) => {
        const value = memberValue(member, candidate);
        const name = member.localProperty.name;
        if (!values.has(name)) {
            values.set(name, value);
            return true;
        }
        return sameValue(values.get(name), value);
    });
}

/**
 * Inputs for adding one value-help row that an owner row can be a member of.
 */
interface RowExtension {
    ownerRow: MockDataRow;
    rowIndex: number;
    domain: Array<Record<string, JsonValue>>;
    targetEntity: SchemaEntity;
    parameters: ReadonlyArray<SchemaValueListParameter>;
    members: ReadonlyArray<ValueListTupleMember>;
    fixedValue: (member: ValueListTupleMember) => JsonValue | undefined;
    /** Whether a value is valid for an owner field: facets and the field's planned semantic role. */
    fits: (local: SchemaProperty, value: JsonValue | undefined) => boolean;
    classifications: ReadonlyMap<string, SemanticClassification>;
    maxRows: number;
    preservesRelationships: (row: MockDataRow) => boolean;
}

/**
 * Add a generated value-help row carrying an owner row's fixed context, so the owner can be a tuple
 * member without rewriting that context.
 *
 * A generated value-help domain is sampled independently of the rows that reference it, so it may
 * lack the owner's fixed context: a field another value list already bound, a declared constant,
 * or any value its local field can represent (a narrower local facet). The new row clones a
 * domain row and sets the fixed values, the constants and, where the cloned value does not fit the
 * local field, the owner's own value. When that clone repeats an existing key, the owner's own values
 * are used for the remaining key columns the value list maps. The row is added only when it is valid
 * for every value-help property and semantic role, keeps a unique key, keeps outgoing relationships
 * and stays within the domain capacity.
 *
 * @param extension owner row, domain and constraints
 * @returns the added value-help row, or undefined when no valid row can be added
 */
function extendValueListForRow(extension: RowExtension): Record<string, JsonValue> | undefined {
    const { ownerRow, rowIndex, domain, targetEntity, parameters, members, fixedValue, fits } = extension;
    if (domain.length === 0 || domain.length >= extension.maxRows) {
        return undefined;
    }
    const targetProperties = new Map(targetEntity.properties.map((property) => [property.name, property]));
    // Only columns the value-help entity declares can be carried by a new row.
    if (
        members.some(({ valueListProperty }) => !targetProperties.has(valueListProperty)) ||
        parameters.some(
            ({ constant, valueListProperty }) =>
                constant !== undefined && (!valueListProperty || !targetProperties.has(valueListProperty))
        )
    ) {
        return undefined;
    }
    const keys = targetEntity.properties.filter(({ isKey }) => isKey);
    const signature = (row: MockDataRow): string => JSON.stringify(keys.map(({ name }) => row[name]));
    const signatures = new Set(domain.map(signature));
    // Members that fill the same owner field must carry one value, so they are set together.
    const groups = [...new Set(members.map(({ localProperty }) => localProperty.name))].map((name) =>
        members.filter(({ localProperty }) => localProperty.name === name)
    );
    const ownerValue = (group: ReadonlyArray<ValueListTupleMember>): JsonValue | undefined => {
        const local = group[0].localProperty;
        const value = ownerRow[local.name];
        return value !== undefined && fits(local, value) ? value : undefined;
    };
    const assign = (
        clone: Record<string, JsonValue>,
        group: ReadonlyArray<ValueListTupleMember>,
        value: JsonValue
    ): void =>
        group.forEach(({ valueListProperty }) => {
            clone[valueListProperty] = value;
        });
    for (let offset = 0; offset < domain.length; offset += 1) {
        const clone: Record<string, JsonValue> = { ...domain[(rowIndex + offset) % domain.length] };
        parameters.forEach(({ constant, valueListProperty }) => {
            if (constant !== undefined && valueListProperty) {
                clone[valueListProperty] = constant;
            }
        });
        let complete = true;
        for (const group of groups) {
            const fixed = fixedValue(group[0]);
            const values = group.map((member) => memberValue(member, clone));
            const representable =
                values[0] !== undefined &&
                fits(group[0].localProperty, values[0]) &&
                values.every((value) => sameValue(value, values[0]));
            const value = fixed ?? (representable ? undefined : ownerValue(group));
            if (fixed === undefined && !representable && value === undefined) {
                complete = false;
                break;
            }
            if (value !== undefined) {
                assign(clone, group, value);
            }
        }
        if (!complete) {
            continue;
        }
        if (signatures.has(signature(clone))) {
            for (const group of groups) {
                const value = ownerValue(group);
                if (
                    value !== undefined &&
                    fixedValue(group[0]) === undefined &&
                    group.some(
                        ({ display, valueListProperty }) => !display && targetProperties.get(valueListProperty)?.isKey
                    )
                ) {
                    assign(clone, group, value);
                }
            }
        }
        const valid = targetEntity.properties.every((property) => {
            const role = extension.classifications.get(
                semanticPropertyKey(targetEntity.entitySetName, property.name)
            )?.role;
            return (
                Object.prototype.hasOwnProperty.call(clone, property.name) &&
                propertyValueIsValid(property, clone[property.name]) &&
                (!role || role === 'unknown' || semanticValueIsValid(role, property, clone[property.name]))
            );
        });
        const fitsOwner = groups.every((group) => {
            const value = memberValue(group[0], clone);
            const fixed = fixedValue(group[0]);
            return (
                value !== undefined &&
                fits(group[0].localProperty, value) &&
                group.every((member) => sameValue(memberValue(member, clone), value)) &&
                (fixed === undefined || sameValue(value, fixed))
            );
        });
        if (valid && fitsOwner && !signatures.has(signature(clone)) && extension.preservesRelationships(clone)) {
            domain.push(clone);
            return clone;
        }
    }
    return undefined;
}

/**
 * A value list of an owner entity as projection sees it.
 */
interface ProjectionList {
    collection: string;
    parameters: ReadonlyArray<SchemaValueListParameter>;
    /** `EntitySet.Property` of the owner property. */
    target: string;
    members: ReadonlyArray<ValueListTupleMember>;
}

/**
 * Owner-row operations that joint solving needs from projection.
 */
interface JointSolvingContext {
    /** Current value-help rows of a list, or undefined when its context is unavailable. */
    domain: (list: ProjectionList) => ReadonlyArray<MockDataRow> | undefined;
    /** Whether the owner row could adopt the value-help row on its own. */
    adoptable: (list: ProjectionList, row: MockDataRow, candidate: MockDataRow) => boolean;
    /** Write a chosen tuple into the owner row; returns true when the row changed. */
    adopt: (
        rowIndex: number,
        row: Record<string, JsonValue>,
        list: ProjectionList,
        selected: MockDataRow,
        jointOwners: ReadonlyMap<string, string>
    ) => boolean;
}

/**
 * Solve the rows whose value lists failed individually by choosing one tuple per connected value list
 * at once (see solveTupleChoice). A solved component replaces the bindings of the fields it covers;
 * each field is then owned by the first connected list that determines it.
 *
 * @param failedRows failure message per value list, by owner row index
 * @param rows owner rows (mutated)
 * @param lists value lists of the owner entity
 * @param context domain lookup, adoptability and adoption
 * @returns whether any row changed, and the failures that remain
 */
function solveFailedRowsJointly(
    failedRows: ReadonlyMap<number, ReadonlyMap<string, string>>,
    rows: Array<Record<string, JsonValue>>,
    lists: ReadonlyArray<ProjectionList>,
    context: JointSolvingContext
): { changed: boolean; unresolved: ReadonlyArray<readonly [string, string]> } {
    let changed = false;
    const unresolvedFailures: Array<readonly [string, string]> = [];
    for (const [rowIndex, failures] of failedRows) {
        const row = rows[rowIndex];
        const unresolved = new Map(failures);
        for (const target of failures.keys()) {
            const failed = lists.find((list) => list.target === target);
            if (!failed || !unresolved.has(target)) {
                continue;
            }
            const component = sharingComponent(failed, lists).filter((list) => context.domain(list) !== undefined);
            const outcome = solveTupleChoice(
                component.map((list) => ({
                    id: list.target,
                    members: list.members,
                    candidates: (context.domain(list) ?? []).filter((candidate) =>
                        context.adoptable(list, row, candidate)
                    )
                })),
                rowIndex
            );
            if (outcome.status !== 'solved') {
                continue;
            }
            const owners = new Map<string, string>();
            for (const list of component) {
                for (const { localProperty } of list.members) {
                    if (!owners.has(localProperty.name)) {
                        owners.set(localProperty.name, list.target);
                    }
                }
            }
            for (const list of component) {
                const chosen = outcome.choices.get(list.target);
                if (chosen && context.adopt(rowIndex, row, list, chosen, owners)) {
                    changed = true;
                }
                unresolved.delete(list.target);
            }
        }
        unresolved.forEach((message, target) => unresolvedFailures.push([target, message]));
    }
    return { changed, unresolved: unresolvedFailures };
}

/**
 * Copy refreshed companion values into the working rows.
 *
 * @param generated working rows by resource (mutated)
 * @param refreshed the same rows with recomputed companions, in the same order
 * @returns true when any value changed
 */
function applyCompanions(
    generated: Record<string, Array<Record<string, JsonValue>>>,
    refreshed: Readonly<Record<string, ReadonlyArray<MockDataRow>>>
): boolean {
    let changed = false;
    for (const [resource, rows] of Object.entries(generated)) {
        const refreshedRows = refreshed[resource] ?? [];
        for (const [rowIndex, row] of rows.entries()) {
            for (const [name, value] of Object.entries(refreshedRows[rowIndex] ?? {})) {
                if (!sameValue(row[name], value)) {
                    row[name] = value;
                    changed = true;
                }
            }
        }
    }
    return changed;
}

function projectValueLists(
    graph: SchemaGraph,
    resources: Readonly<Record<string, ReadonlyArray<MockDataRow>>>,
    existingData: Readonly<Record<string, ExistingMockData>>,
    diagnostics: MockDataGeneratorDiagnostic[],
    classifications: ReadonlyMap<string, SemanticClassification>,
    targetKinds: ReadonlyMap<string, 'entity-set' | 'singleton'>,
    projectedProperties: Map<string, Set<string>>,
    relevanceVerifiedResources: ReadonlySet<string>,
    refreshCompanions?: CompanionRefresh
): Readonly<Record<string, ReadonlyArray<MockDataRow>>> {
    const generated = Object.fromEntries(
        Object.entries(resources).map(([resource, rows]) => [resource, rows.map((row) => ({ ...row }))])
    );
    const relationshipProperties = new Map<string, Set<string>>();
    const projectedBindings = new Map<string, Map<string, ProjectedBinding>>();
    // Which value lists projected each owner field, so a list is not constrained by its own choice.
    const projectedBy = new Map<string, Map<string, Set<string>>>();
    const bindingKey = (entitySet: string, rowIndex: number): string => `${entitySet}\u0000${rowIndex}`;
    // Conflicts are collected per fixed-point pass; only those of the final pass describe the result.
    let pendingConflicts = new Map<string, string>();
    const reportConflict = (target: string, message: string): void => {
        if (!pendingConflicts.has(target)) {
            pendingConflicts.set(target, message);
        }
    };
    const markProjected = (entitySet: string, localProperty: string, target: string): void => {
        const projected = projectedProperties.get(entitySet) ?? new Set<string>();
        projected.add(localProperty);
        projectedProperties.set(entitySet, projected);
        const byProperty = projectedBy.get(entitySet) ?? new Map<string, Set<string>>();
        const sources = byProperty.get(localProperty) ?? new Set<string>();
        sources.add(target);
        byProperty.set(localProperty, sources);
        projectedBy.set(entitySet, byProperty);
    };
    const projectedByOther = (entitySet: string, localProperty: string, target: string): boolean =>
        [...(projectedBy.get(entitySet)?.get(localProperty) ?? [])].some((source) => source !== target);
    for (const relationship of generationRelationships(graph)) {
        const sourceProperties = relationshipProperties.get(relationship.fromEntitySet) ?? new Set<string>();
        const targetProperties = relationshipProperties.get(relationship.toEntitySet) ?? new Set<string>();
        relationship.mappings.forEach(({ sourceProperty, targetProperty }) => {
            sourceProperties.add(sourceProperty);
            targetProperties.add(targetProperty);
        });
        relationshipProperties.set(relationship.fromEntitySet, sourceProperties);
        relationshipProperties.set(relationship.toEntitySet, targetProperties);
    }
    const preservesOutgoingRelationships =
        (collection: string) =>
        (candidate: MockDataRow): boolean =>
            generationRelationships(graph)
                .filter(({ fromEntitySet }) => fromEntitySet === collection)
                .every((relationship) => {
                    const targetRows = authoritativeRows(graph, relationship.toEntitySet, generated, existingData);
                    const values = relationship.mappings.map(({ sourceProperty }) => candidate[sourceProperty]);
                    return (
                        values.every((value) => value === null) ||
                        targetRows.some((targetRow) =>
                            relationship.mappings.every(({ sourceProperty, targetProperty }) =>
                                sameValue(candidate[sourceProperty], targetRow[targetProperty])
                            )
                        )
                    );
                });
    const maxPasses = Math.max(1, graph.entities.length + 1);
    for (let pass = 0; pass < maxPasses; pass += 1) {
        let changed = false;
        pendingConflicts = new Map<string, string>();
        // Owner-side values each value list can supply, per shared field set, sampled at the start of
        // the pass. Used to prefer tuples that another value list of the same row can agree with.
        const supportCache = new Map<string, ReadonlySet<string>>();
        for (const entity of graph.entities) {
            const rows = generated[entity.entitySetName];
            if (!rows) {
                continue;
            }
            const properties = new Map(entity.properties.map((candidate) => [candidate.name, candidate]));
            const protectedProperties = tupleProtectedProperties(graph, entity, existingData);
            const initialRows = existingData[entity.entitySetName]?.initialRows;
            const ownerIsAuthoritative =
                initialRows?.present === true && (initialRows.source === 'json' || initialRows.enumerable);
            const isProtected = (local: SchemaProperty): boolean => protectedProperties.has(local.name);
            // A projected value must be valid for the owner field's facets and its planned semantic
            // role, exactly as the field's own generated values are; a value-help column may be
            // generated under a different role (for example a key placeholder for a fax number).
            const fits = (local: SchemaProperty, value: JsonValue | undefined): boolean => {
                if (value === undefined || !propertyValueIsValid(local, value)) {
                    return false;
                }
                const role = classifications.get(semanticPropertyKey(entity.entitySetName, local.name))?.role;
                return !role || role === 'unknown' || semanticValueIsValid(role, local, value);
            };
            const failedRows = new Map<number, Map<string, string>>();
            /**
             * Write a selected tuple into an owner row and record the bindings it establishes.
             *
             * @param rowIndex owner row index
             * @param row owner row (mutated)
             * @param list the value list whose tuple is adopted
             * @param selected the value-help row
             * @param jointOwners for a joint choice, the value list that owns each field's binding; the
             * choice then replaces existing bindings. Without it, a field bound by another value list
             * is left unchanged.
             * @returns true when the row changed
             */
            const adoptTuple = (
                rowIndex: number,
                row: Record<string, JsonValue>,
                list: ProjectionList,
                selected: MockDataRow,
                jointOwners?: ReadonlyMap<string, string>
            ): boolean => {
                let rowChanged = false;
                const key = bindingKey(entity.entitySetName, rowIndex);
                const bindings = projectedBindings.get(key) ?? new Map<string, ProjectedBinding>();
                for (const member of list.members) {
                    const local = member.localProperty;
                    const value = memberValue(member, selected);
                    if (value === undefined || !fits(local, value)) {
                        continue;
                    }
                    const binding = bindings.get(local.name);
                    const ownedElsewhere =
                        jointOwners === undefined && binding !== undefined && binding.owner !== list.target;
                    if (!isProtected(local) && !ownedElsewhere && !sameValue(row[local.name], value)) {
                        row[local.name] = value;
                        rowChanged = true;
                        if (member.direction === 'In' || member.display) {
                            markProjected(entity.entitySetName, local.name, list.target);
                        }
                    }
                    if (!member.display && member.direction !== 'In') {
                        markProjected(entity.entitySetName, local.name, list.target);
                    }
                    if (!ownedElsewhere) {
                        bindings.set(local.name, {
                            value: row[local.name],
                            owner: jointOwners?.get(local.name) ?? list.target
                        });
                    }
                }
                if (bindings.size > 0) {
                    projectedBindings.set(key, bindings);
                }
                return rowChanged;
            };
            const lists = entity.properties.flatMap((property): ProjectionList[] => {
                const collection = property.links?.valueListCollection;
                const parameters = effectiveValueListParameters(property);
                if (!collection || parameters.length === 0) {
                    return [];
                }
                const context = resolveValueListContext(graph, collection, generated, existingData);
                return [
                    {
                        collection,
                        parameters,
                        target: `${entity.entitySetName}.${property.name}`,
                        members: valueListTupleMembers(property, parameters, properties, context.targetEntity)
                    }
                ];
            });
            const supportFor = (
                list: ProjectionList,
                shared: ReadonlyArray<string>
            ): ReadonlySet<string> | undefined => {
                const cacheKey = `${list.target}\u0000${shared.join('\u0000')}`;
                const cached = supportCache.get(cacheKey);
                if (cached) {
                    return cached;
                }
                const context = resolveValueListContext(graph, list.collection, generated, existingData);
                if (context.source === 'unavailable') {
                    return undefined;
                }
                const keys = new Set<string>();
                for (const candidate of context.rows) {
                    if (
                        list.parameters.some(
                            ({ constant, valueListProperty }) =>
                                constant !== undefined && !sameValue(candidate[valueListProperty ?? ''], constant)
                        )
                    ) {
                        continue;
                    }
                    const values = shared.map((name) => {
                        const member = list.members.find(({ localProperty }) => localProperty.name === name);
                        return member ? memberValue(member, candidate) : undefined;
                    });
                    if (
                        values.every((value, index) => {
                            const local = properties.get(shared[index]);
                            return local !== undefined && fits(local, value);
                        })
                    ) {
                        keys.add(JSON.stringify(values));
                    }
                }
                supportCache.set(cacheKey, keys);
                return keys;
            };
            for (const list of lists) {
                const { collection, parameters: effectiveParameters, target, members } = list;
                const context = resolveValueListContext(graph, collection, generated, existingData);
                if (context.source === 'unavailable') {
                    if (
                        !diagnostics.some(
                            ({ code, target: diagnosticTarget }) =>
                                code === 'SEMANTIC_TUPLE_CONTEXT_UNAVAILABLE' && diagnosticTarget === target
                        )
                    ) {
                        diagnostics.push({
                            code: 'SEMANTIC_TUPLE_CONTEXT_UNAVAILABLE',
                            severity: 'warning',
                            target,
                            message: `Value-list collection ${collection} is unavailable; tuple projection was skipped.`
                        });
                    }
                    continue;
                }
                const domain = context.rows;
                const relationshipProtected = relationshipProperties.get(entity.entitySetName) ?? new Set<string>();
                const extensible =
                    context.source === 'generated' && context.targetEntity !== undefined && !ownerIsAuthoritative;
                if (extensible && context.targetEntity) {
                    const extended = extendGeneratedValueListDomain(
                        rows,
                        generated[collection] ?? [],
                        context.targetEntity,
                        effectiveParameters,
                        properties,
                        (local) =>
                            local.isKey ||
                            relationshipProtected.has(local.name) ||
                            projectedByOther(entity.entitySetName, local.name, target),
                        classifications,
                        targetKinds.get(collection) === 'singleton' ? 1 : MAX_GENERATED_VALUE_LIST_ROWS,
                        relevanceVerifiedResources.has(collection),
                        preservesOutgoingRelationships(collection),
                        () =>
                            reportConflict(
                                target,
                                'Generated value-list domain capacity or constraints prevent preserving all protected tuples.'
                            )
                    );
                    if (extended) {
                        changed = true;
                    }
                }
                // Other value lists of this entity that determine one of this list's fields.
                const sharing = lists.flatMap((other) => {
                    if (other === list) {
                        return [];
                    }
                    const locals = new Set(members.map(({ localProperty }) => localProperty.name));
                    const shared = [...new Set(other.members.map(({ localProperty }) => localProperty.name))].filter(
                        (name) => locals.has(name) && !properties.get(name)?.isKey
                    );
                    return shared.length > 0 ? [{ other, shared }] : [];
                });
                for (const [rowIndex, row] of rows.entries()) {
                    const rowBindings = projectedBindings.get(bindingKey(entity.entitySetName, rowIndex));
                    const foreignBinding = (member: ValueListTupleMember): ProjectedBinding | undefined => {
                        const binding = rowBindings?.get(member.localProperty.name);
                        return binding !== undefined && binding.owner !== target ? binding : undefined;
                    };
                    const fixedValue = (member: ValueListTupleMember): JsonValue | undefined => {
                        if (isProtected(member.localProperty)) {
                            return row[member.localProperty.name];
                        }
                        return foreignBinding(member)?.value;
                    };
                    // A tuple is compatible when it satisfies the constants, every value it carries fits
                    // its local field, and it keeps the protected fields. Unprotected In fields are the
                    // row's own context and adopt the tuple's value like InOut fields do.
                    const compatible = domain.filter(
                        (candidate) =>
                            effectiveParameters.every(
                                ({ constant, valueListProperty }) =>
                                    constant === undefined || sameValue(candidate[valueListProperty ?? ''], constant)
                            ) &&
                            members.every((member) => {
                                const value = memberValue(member, candidate);
                                if (!fits(member.localProperty, value)) {
                                    return false;
                                }
                                return (
                                    !isProtected(member.localProperty) ||
                                    sameValue(row[member.localProperty.name], value)
                                );
                            }) &&
                            membersAgree(members, candidate)
                    );
                    const boundMembers = members.filter(
                        (member) => !isProtected(member.localProperty) && foreignBinding(member) !== undefined
                    );
                    const agreesWithBindings = (candidate: MockDataRow): boolean =>
                        boundMembers.every((member) =>
                            sameValue(foreignBinding(member)?.value, memberValue(member, candidate))
                        );
                    const base = boundMembers.length > 0 ? compatible.filter(agreesWithBindings) : compatible;
                    const inOutProperties = effectiveParameters.flatMap(({ direction, localProperty }) =>
                        direction === 'InOut' && localProperty ? [localProperty] : []
                    );
                    const generatedBindingIsCurrent =
                        rowBindings !== undefined &&
                        inOutProperties.length > 0 &&
                        inOutProperties.every((localProperty) => {
                            const binding = rowBindings.get(localProperty);
                            return binding !== undefined && sameValue(row[localProperty], binding.value);
                        });
                    // A generated scalar that happens to equal one target value is not
                    // evidence of a prior binding. Only authored owner rows or a tuple
                    // projected during an earlier fixed-point pass may constrain selection.
                    const preferred =
                        generatedBindingIsCurrent || ownerIsAuthoritative
                            ? base.filter((candidate) =>
                                  effectiveParameters.every(
                                      ({ direction, localProperty, valueListProperty }) =>
                                          direction !== 'InOut' ||
                                          !localProperty ||
                                          !valueListProperty ||
                                          sameValue(row[localProperty], candidate[valueListProperty])
                                  )
                              )
                            : [];
                    // Prefer tuples that every other value list sharing a field of this row can agree with.
                    const supported = (candidate: MockDataRow): boolean =>
                        sharing.every(({ other, shared }) => {
                            const support = supportFor(other, shared);
                            if (!support) {
                                return true;
                            }
                            const values = shared.map((name) => {
                                const member = members.find(({ localProperty }) => localProperty.name === name);
                                if (member && isProtected(member.localProperty)) {
                                    return row[name];
                                }
                                return member ? memberValue(member, candidate) : undefined;
                            });
                            return support.has(JSON.stringify(values));
                        });
                    let candidatePool = preferred.length > 0 ? preferred : base;
                    if (sharing.length > 0) {
                        const supportedPool = candidatePool.filter(supported);
                        const supportedBase = supportedPool.length > 0 ? supportedPool : base.filter(supported);
                        if (supportedBase.length > 0) {
                            candidatePool = supportedBase;
                        }
                    }
                    let selected: MockDataRow | undefined = candidatePool[rowIndex % candidatePool.length];
                    // A declared enumeration is its own closed domain: a generated value help that lacks
                    // the enumerated value is a schema conflict, not a gap to fill.
                    const enumerationPinned = members.some(
                        ({ localProperty }) => localProperty.enumValues !== undefined && isProtected(localProperty)
                    );
                    if (
                        !selected &&
                        extensible &&
                        context.targetEntity &&
                        !enumerationPinned &&
                        !relevanceVerifiedResources.has(collection)
                    ) {
                        selected = extendValueListForRow({
                            ownerRow: row,
                            rowIndex,
                            domain: generated[collection] ?? [],
                            targetEntity: context.targetEntity,
                            parameters: effectiveParameters,
                            members,
                            fixedValue,
                            fits,
                            classifications,
                            maxRows: targetKinds.get(collection) === 'singleton' ? 1 : MAX_GENERATED_VALUE_LIST_ROWS,
                            preservesRelationships: preservesOutgoingRelationships(collection)
                        });
                        if (selected) {
                            changed = true;
                        }
                    }
                    if (!selected) {
                        const failures = failedRows.get(rowIndex) ?? new Map<string, string>();
                        failures.set(
                            target,
                            boundMembers.length > 0 && compatible.length > 0
                                ? 'Value-help tuples conflict with an earlier projected application binding; the earlier binding was preserved.'
                                : 'Value-help and relationship constraints have no compatible row; authoritative assignments were preserved.'
                        );
                        failedRows.set(rowIndex, failures);
                        continue;
                    }
                    if (adoptTuple(rowIndex, row, list, selected)) {
                        changed = true;
                    }
                }
            }
            // A row whose value lists share fields may need a tuple choice that no list finds on its
            // own (for example a text shared by two lists whose domains agree only on rows that a third
            // list's binding excludes). Such rows are solved jointly over the connected lists.
            const joint = solveFailedRowsJointly(failedRows, rows, lists, {
                domain: (list) => {
                    const context = resolveValueListContext(graph, list.collection, generated, existingData);
                    return context.source === 'unavailable' ? undefined : context.rows;
                },
                adoptable: (list, row, candidate) =>
                    list.parameters.every(
                        ({ constant, valueListProperty }) =>
                            constant === undefined || sameValue(candidate[valueListProperty ?? ''], constant)
                    ) &&
                    list.members.every((member) => {
                        const value = memberValue(member, candidate);
                        return (
                            fits(member.localProperty, value) &&
                            (!isProtected(member.localProperty) || sameValue(row[member.localProperty.name], value))
                        );
                    }) &&
                    membersAgree(list.members, candidate),
                adopt: adoptTuple
            });
            if (joint.changed) {
                changed = true;
            }
            joint.unresolved.forEach(([target, message]) => reportConflict(target, message));
        }
        // Format providers describe codes (currency names, country names, code-list columns). A
        // projected or cloned code must carry its provider values before owners copy them, so the
        // providers take part in the fixed point instead of rewriting value-help rows afterwards.
        if (refreshCompanions && applyCompanions(generated, refreshCompanions(generated))) {
            changed = true;
        }
        if (!changed) {
            break;
        }
    }
    for (const [target, message] of pendingConflicts) {
        if (
            !diagnostics.some(
                ({ code, target: diagnosticTarget }) =>
                    code === 'SEMANTIC_DOMAIN_CONFLICT' && diagnosticTarget === target
            )
        ) {
            diagnostics.push({ code: 'SEMANTIC_DOMAIN_CONFLICT', severity: 'warning', target, message });
        }
    }
    return Object.freeze(
        Object.fromEntries(
            Object.entries(generated).map(([resource, rows]) => [
                resource,
                Object.freeze(rows.map((row) => Object.freeze(row)))
            ])
        )
    );
}

function descriptorTokens(
    relationship: SchemaRelationship,
    sourceEntity: SchemaEntity | undefined
): ReadonlySet<string> {
    return tokens(relationship.partner ?? sourceEntity?.entitySetName ?? relationship.fromEntitySet);
}

function matchingRelationship(
    property: SchemaProperty,
    relationships: ReadonlyArray<SchemaRelationship>,
    entities: ReadonlyMap<string, SchemaEntity>
): SchemaRelationship | undefined {
    const propertyTokens = tokens(property.name);
    return relationships
        .map((relationship) => ({
            relationship,
            descriptor: descriptorTokens(relationship, entities.get(relationship.fromEntitySet))
        }))
        .filter(({ descriptor }) => descriptor.size > 0 && [...descriptor].every((token) => propertyTokens.has(token)))
        .sort(
            (left, right) =>
                right.descriptor.size - left.descriptor.size ||
                left.relationship.fromEntitySet.localeCompare(right.relationship.fromEntitySet)
        )[0]?.relationship;
}

const DRAFT_KEY_NAMES = new Set(['draftuuid', 'isactiveentity', 'hasactiveentity', 'hasdraftentity']);

/**
 * Whether a field is governed by a value list: it carries a value-list annotation itself, or a value
 * list of its entity maps it as an In, InOut or Out parameter.
 *
 * @param entity owning entity
 * @param property candidate field
 * @returns true when a value list determines the field's value
 */
function isValueListField(entity: SchemaEntity, property: SchemaProperty): boolean {
    return (
        property.links?.valueListCollection !== undefined ||
        entity.properties.some((owner) =>
            effectiveValueListParameters(owner).some(
                ({ direction, localProperty }) => direction !== 'DisplayOnly' && localProperty === property.name
            )
        )
    );
}

/**
 * Whether a value-help column is copied into owners by some value list: a non-DisplayOnly parameter
 * maps it, or it is the display text an owner mirrors.
 *
 * @param graph schema graph
 * @param entity value-help entity
 * @param property candidate column
 * @returns true when changing the column would invalidate owners' tuples
 */
function isValueListDomainColumn(graph: SchemaGraph, entity: SchemaEntity, property: SchemaProperty): boolean {
    return graph.entities.some((ownerEntity) => {
        const ownerProperties = new Map(ownerEntity.properties.map((candidate) => [candidate.name, candidate]));
        return ownerEntity.properties.some((owner) => {
            if (owner.links?.valueListCollection !== entity.entitySetName) {
                return false;
            }
            const parameters = effectiveValueListParameters(owner);
            return valueListTupleMembers(owner, parameters, ownerProperties, entity).some(
                ({ valueListProperty }) => valueListProperty === property.name
            );
        });
    });
}

function derivedRelationshipForProperty(
    graph: SchemaGraph,
    parent: SchemaEntity,
    property: SchemaProperty
): SchemaRelationship | undefined {
    const propertyTokens = tokens(property.name);
    const parentTokens = tokens(parent.entitySetName);
    const candidates = graph.entities
        .filter((entity) => entity.entitySetName !== parent.entitySetName)
        .flatMap((child) => {
            const childTokens = tokens(child.entitySetName);
            const descriptor = new Set(
                [...childTokens].filter((token) => !parentTokens.has(token) && token !== 'code')
            );
            if (descriptor.size === 0 || ![...descriptor].every((token) => propertyTokens.has(token))) {
                return [];
            }
            const childProperties = new Map(child.properties.map((candidate) => [candidate.name, candidate]));
            const parentKeys = parent.properties.filter(
                ({ isKey, name }) => isKey && !DRAFT_KEY_NAMES.has(name.toLowerCase())
            );
            // A child field governed by a value list takes its values from that list's tuples, so a
            // name match to the parent key is not evidence of a link the generator may enforce.
            const mappings = parentKeys.flatMap((parentKey) => {
                const childProperty = childProperties.get(parentKey.name);
                return childProperty?.primitiveType === parentKey.primitiveType &&
                    !isValueListField(child, childProperty)
                    ? [{ sourceProperty: childProperty.name, targetProperty: parentKey.name }]
                    : [];
            });
            return parentKeys.length > 0 && mappings.length === parentKeys.length
                ? [{ child, descriptor, mappings }]
                : [];
        })
        .sort(
            (left, right) =>
                right.descriptor.size - left.descriptor.size ||
                left.child.entitySetName.localeCompare(right.child.entitySetName)
        );
    const selected = candidates[0];
    if (!selected || selected.descriptor.size === (candidates[1]?.descriptor.size ?? -1)) {
        return undefined;
    }
    return Object.freeze({
        name: `derived:${selected.child.entitySetName}`,
        partner: [...selected.descriptor].join(' '),
        fromEntitySet: selected.child.entitySetName,
        toEntitySet: parent.entitySetName,
        mappings: Object.freeze(selected.mappings),
        provenance: 'inferred',
        confidence: 0.8,
        targetCardinality: 'one'
    });
}

function derivedRelationships(graph: SchemaGraph): ReadonlyArray<SchemaRelationship> {
    const existing = generationRelationships(graph);
    const signatures = new Set(
        existing.map(
            (relationship) =>
                `${relationship.fromEntitySet}->${relationship.toEntitySet}:${relationship.mappings
                    .map(({ sourceProperty, targetProperty }) => `${sourceProperty}:${targetProperty}`)
                    .sort()
                    .join('|')}`
        )
    );
    const derived: SchemaRelationship[] = [];
    for (const parent of graph.entities) {
        const incoming = existing.filter((relationship) => relationship.toEntitySet === parent.entitySetName);
        for (const property of parent.properties) {
            const propertyTokens = new Set(rawTokens(property.name));
            const isDerivedField =
                propertyTokens.has('has') ||
                propertyTokens.has('count') ||
                (propertyTokens.has('number') && propertyTokens.has('of'));
            if (
                !isDerivedField ||
                matchingRelationship(
                    property,
                    incoming,
                    new Map(graph.entities.map((entity) => [entity.entitySetName, entity]))
                )
            ) {
                continue;
            }
            const relationship = derivedRelationshipForProperty(graph, parent, property);
            if (!relationship) {
                continue;
            }
            const signature = `${relationship.fromEntitySet}->${relationship.toEntitySet}:${relationship.mappings
                .map(({ sourceProperty, targetProperty }) => `${sourceProperty}:${targetProperty}`)
                .sort()
                .join('|')}`;
            if (!signatures.has(signature)) {
                signatures.add(signature);
                derived.push(relationship);
            }
        }
    }
    return Object.freeze(derived);
}

/**
 * Properties on either end of a generated relationship. Their values tie rows together, so a
 * derived-field pass must not rewrite them.
 *
 * @param graph - Service schema.
 * @returns `entitySet\u0000property` references of every foreign key and referenced property.
 */
function relationshipBoundProperties(graph: SchemaGraph): ReadonlySet<string> {
    return new Set(
        generationRelationships(graph).flatMap(({ fromEntitySet, toEntitySet, mappings }) =>
            mappings.flatMap(({ sourceProperty, targetProperty }) => [
                `${fromEntitySet}\u0000${sourceProperty}`,
                `${toEntitySet}\u0000${targetProperty}`
            ])
        )
    );
}

function alignDerivedChildDomains(
    graph: SchemaGraph,
    resources: Readonly<Record<string, ReadonlyArray<MockDataRow>>>,
    existingData: Readonly<Record<string, ExistingMockData>>
): Readonly<Record<string, ReadonlyArray<MockDataRow>>> {
    const generated = Object.fromEntries(
        Object.entries(resources).map(([resource, rows]) => [resource, rows.map((row) => ({ ...row }))])
    );
    const entities = new Map(graph.entities.map((entity) => [entity.entitySetName, entity]));
    const bound = relationshipBoundProperties(graph);
    for (const relationship of derivedRelationships(graph)) {
        const childRows = generated[relationship.fromEntitySet];
        const parentRows = authoritativeRows(graph, relationship.toEntitySet, resources, existingData);
        const childEntity = entities.get(relationship.fromEntitySet);
        if (!childRows || parentRows.length === 0 || !childEntity) {
            continue;
        }
        const original = childRows.map((row) => ({ ...row }));
        childRows.forEach((childRow, rowIndex) => {
            const parentRow = parentRows[rowIndex % parentRows.length];
            relationship.mappings.forEach(({ sourceProperty, targetProperty }) => {
                const property = childEntity.properties.find(({ name }) => name === sourceProperty);
                const value = parentRow?.[targetProperty];
                if (
                    property &&
                    value !== undefined &&
                    !bound.has(`${relationship.fromEntitySet}\u0000${sourceProperty}`) &&
                    propertyValueIsValid(property, value)
                ) {
                    childRow[sourceProperty] = value;
                }
            });
        });
        const keys = childEntity.properties.filter(({ isKey }) => isKey);
        const signatures = new Set(childRows.map((row) => JSON.stringify(keys.map(({ name }) => row[name]))));
        if (signatures.size !== childRows.length) {
            generated[relationship.fromEntitySet] = original;
        }
    }
    return Object.freeze(
        Object.fromEntries(
            Object.entries(generated).map(([resource, rows]) => [
                resource,
                Object.freeze(rows.map((row) => Object.freeze(row)))
            ])
        )
    );
}

function countValue(property: SchemaProperty, count: number): JsonValue | undefined {
    const value: JsonValue = property.primitiveType === 'string' ? String(count) : count;
    return propertyValueIsValid(property, value) ? value : undefined;
}

function deriveRelationshipFields(
    graph: SchemaGraph,
    resources: Readonly<Record<string, ReadonlyArray<MockDataRow>>>,
    existingData: Readonly<Record<string, ExistingMockData>>,
    diagnostics: MockDataGeneratorDiagnostic[],
    classifications: ReadonlyMap<string, SemanticClassification>
): Readonly<Record<string, ReadonlyArray<MockDataRow>>> {
    const entities = new Map(graph.entities.map((entity) => [entity.entitySetName, entity]));
    const generated = Object.fromEntries(
        Object.entries(resources).map(([resource, rows]) => [resource, rows.map((row) => ({ ...row }))])
    );
    const bound = relationshipBoundProperties(graph);
    for (const parent of graph.entities) {
        const parentRows = generated[parent.entitySetName];
        if (!parentRows) {
            continue;
        }
        const incoming = [...generationRelationships(graph), ...derivedRelationships(graph)].filter(
            (relationship) =>
                relationship.toEntitySet === parent.entitySetName && relationship.targetCardinality !== 'many'
        );
        for (const property of parent.properties) {
            // A field governed by a value list takes its values from that list's tuples; a count
            // derived from its name would replace a projected tuple value with one outside the domain.
            if (isValueListField(parent, property)) {
                continue;
            }
            const propertyTokens = new Set(rawTokens(property.name));
            const isCount =
                (property.primitiveType === 'int' ||
                    property.primitiveType === 'decimal' ||
                    property.primitiveType === 'string') &&
                (propertyTokens.has('count') || (propertyTokens.has('number') && propertyTokens.has('of')));
            const isPresence = property.primitiveType === 'bool' && propertyTokens.has('has');
            // A key or relationship value identifies rows, and a field planned with a format such as a
            // phone number cannot hold a count; a derived value must not replace either. A value-help
            // column copied by value-list owners is a tuple member, not a derived count either.
            const role = classifications.get(semanticPropertyKey(parent.entitySetName, property.name))?.role;
            const validator = role ? semanticRoleDefinition(role)?.validator : undefined;
            if (
                (!isCount && !isPresence) ||
                property.isKey ||
                bound.has(`${parent.entitySetName}\u0000${property.name}`) ||
                (validator !== undefined && validator !== 'structural') ||
                isValueListDomainColumn(graph, parent, property)
            ) {
                continue;
            }
            const relationship = matchingRelationship(property, incoming, entities);
            if (!relationship) {
                if (isCount) {
                    const target = `${parent.entitySetName}.${property.name}`;
                    diagnostics.push({
                        code: 'SEMANTIC_DERIVATION_UNAVAILABLE',
                        severity: 'warning',
                        target,
                        message:
                            'No unambiguous modeled child domain backs this count; an empty synthetic domain is used, not validated business coverage.'
                    });
                    const zero = countValue(property, 0);
                    const descriptor = tokens(property.name);
                    const presence = parent.properties.filter(
                        (candidate) =>
                            candidate.primitiveType === 'bool' &&
                            rawTokens(candidate.name).includes('has') &&
                            [...descriptor].every((token) => tokens(candidate.name).has(token))
                    );
                    if (zero !== undefined) {
                        parentRows.forEach((row) => {
                            row[property.name] = zero;
                            presence.forEach(({ name }) => {
                                row[name] = false;
                            });
                        });
                    }
                }
                continue;
            }
            const childRows = authoritativeRows(graph, relationship.fromEntitySet, resources, existingData);
            for (const parentRow of parentRows) {
                const count = childRows.filter((childRow) =>
                    relationship.mappings.every(({ sourceProperty, targetProperty }) =>
                        sameValue(childRow[sourceProperty], parentRow[targetProperty])
                    )
                ).length;
                const derived = isPresence ? count > 0 : countValue(property, count);
                if (derived !== undefined && propertyValueIsValid(property, derived)) {
                    parentRow[property.name] = derived;
                }
            }
        }
    }
    return Object.freeze(
        Object.fromEntries(
            Object.entries(generated).map(([resource, rows]) => [
                resource,
                Object.freeze(rows.map((row) => Object.freeze(row)))
            ])
        )
    );
}

/**
 * Re-run deterministic invariants after SFT and derive fields from the final relationship world.
 *
 * @param graph
 * @param resources
 * @param existingData
 * @param seed
 * @param classifications
 * @param diagnostics
 * @param coherence
 * @param targetKinds Resource cardinality constraints.
 * @param temporalConstraints Explicit field ordering overrides.
 * @param relevanceVerifiedResources
 * @param projectedProperties receives the properties whose values were projected from a related
 * entity or from a code in the same row, so the caller can attribute those cells to the tier that
 * supplied them rather than to the deterministic sweep that filled them first.
 * @param refreshCompanions recomputes format-provider companions of codes; applied after every
 * value-list projection pass so owners copy the companions of the final value-help codes.
 */
export function finalizeSemanticServiceWorld(
    graph: SchemaGraph,
    resources: Readonly<Record<string, ReadonlyArray<MockDataRow>>>,
    existingData: Readonly<Record<string, ExistingMockData>>,
    seed: number,
    classifications: ReadonlyMap<string, SemanticClassification> = new Map(),
    diagnostics: MockDataGeneratorDiagnostic[] = [],
    coherence: Readonly<Record<string, readonly SyntheticCoherenceRule[]>> = {},
    targetKinds: ReadonlyMap<string, 'entity-set' | 'singleton'> = new Map(),
    temporalConstraints: readonly TemporalConstraint[] = [],
    relevanceVerifiedResources: ReadonlySet<string> = new Set(),
    projectedProperties: Map<string, Set<string>> = new Map(),
    refreshCompanions?: CompanionRefresh
): Readonly<Record<string, ReadonlyArray<MockDataRow>>> {
    const protectedProperties = new Map<string, Set<string>>();
    for (const relationship of generationRelationships(graph)) {
        const source = protectedProperties.get(relationship.fromEntitySet) ?? new Set<string>();
        const target = protectedProperties.get(relationship.toEntitySet) ?? new Set<string>();
        relationship.mappings.forEach(({ sourceProperty, targetProperty }) => {
            source.add(sourceProperty);
            target.add(targetProperty);
        });
        protectedProperties.set(relationship.fromEntitySet, source);
        protectedProperties.set(relationship.toEntitySet, target);
    }
    for (const entity of graph.entities) {
        const fixed = protectedProperties.get(entity.entitySetName) ?? new Set<string>();
        entity.properties
            .filter((property) => property.isKey || property.enumValues?.length)
            .forEach(({ name }) => fixed.add(name));
        protectedProperties.set(entity.entitySetName, fixed);
        const initialRows = existingData[entity.entitySetName]?.initialRows;
        if (initialRows?.present && (initialRows.source === 'json' || initialRows.enumerable)) {
            const protectedSet = protectedProperties.get(entity.entitySetName) ?? new Set<string>();
            entity.properties.forEach(({ name }) => protectedSet.add(name));
            protectedProperties.set(entity.entitySetName, protectedSet);
        }
    }
    const coherent = Object.freeze(
        Object.fromEntries(
            Object.entries(resources).map(([resource, rows]) => {
                const entity = graph.entities.find((candidate) => candidate.entitySetName === resource);
                return [
                    resource,
                    entity
                        ? applySemanticCoherence(
                              entity,
                              rows,
                              seed,
                              protectedProperties.get(resource) ?? new Set(),
                              inferredCoherenceRules(resource, coherence[resource], temporalConstraints)
                          )
                        : rows
                ];
            })
        )
    );
    // Value-list owners copy value-help dates, so value-help rows are put in temporal order before they
    // are projected; the ordering pass after projection then leaves those copied columns unchanged and
    // reports the final state.
    const temporallyOrdered = reconcileTemporalPlan(
        graph,
        coherent,
        protectedProperties,
        [],
        temporalConstraints,
        coherence
    );
    const projected = projectValueLists(
        graph,
        temporallyOrdered,
        existingData,
        diagnostics,
        classifications,
        targetKinds,
        projectedProperties,
        relevanceVerifiedResources,
        refreshCompanions
    );
    const postProjectionCoherent = Object.freeze(
        Object.fromEntries(
            Object.entries(projected).map(([resource, rows]) => {
                const entity = graph.entities.find((candidate) => candidate.entitySetName === resource);
                if (!entity) {
                    return [resource, rows];
                }
                const protectedAfterProjection = new Set(protectedProperties.get(resource) ?? []);
                projectedProperties
                    .get(resource)
                    ?.forEach((propertyName) => protectedAfterProjection.add(propertyName));
                protectedProperties.set(resource, protectedAfterProjection);
                const initialRows = existingData[resource]?.initialRows;
                if (initialRows?.present && (initialRows.source === 'json' || initialRows.enumerable)) {
                    entity.properties.forEach(({ name }) => protectedAfterProjection.add(name));
                }
                return [
                    resource,
                    applySemanticCoherence(
                        entity,
                        rows,
                        seed,
                        protectedAfterProjection,
                        inferredCoherenceRules(resource, coherence[resource], temporalConstraints)
                    )
                ];
            })
        )
    );
    const ordered = reconcileTemporalPlan(
        graph,
        postProjectionCoherent,
        protectedProperties,
        diagnostics,
        temporalConstraints,
        coherence
    );
    const aligned = alignDerivedChildDomains(graph, ordered, existingData);
    return deriveRelationshipFields(graph, aligned, existingData, diagnostics, classifications);
}
