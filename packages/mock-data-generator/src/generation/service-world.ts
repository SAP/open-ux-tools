import type {
    ExistingMockData,
    JsonValue,
    MockDataRow,
    SemanticClassification,
    MockDataGeneratorDiagnostic,
    SyntheticCoherenceRule,
    SyntheticSampleDataset
} from '../types.js';
import type {
    SchemaEntity,
    SchemaGraph,
    SchemaProperty,
    SchemaRelationship,
    SchemaValueListParameter
} from '../schema/graph.js';
import { applySemanticCoherence } from './coherence.js';
import { reconcileCodeTexts } from './code-texts.js';
import { anchorRowGeography } from './row-geography.js';
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
import { compareCodePoints } from '../ordering.js';
import { DRAFT_KEY_PROPERTY_NAMES } from '../spec/draft.js';
import { MAX_ROWS_PER_ENTITY } from '../limits.js';
import { identifierTokens } from '../naming.js';
import {
    freezeRows,
    hasAuthoritativeRows,
    isKeyOrEnumerated,
    keySignature,
    pushUniqueDiagnostic,
    sameValue
} from './rows.js';

/**
 * Recomputes format-provider companions (currency, country and code-list columns) of every row
 * from its codes; returns rows in the same order.
 */
type CompanionRefresh = (
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
    return identifierTokens(value).map(singular);
}

function tokens(value: string): ReadonlySet<string> {
    return new Set(rawTokens(value).filter((token) => !['number', 'count', 'of', 'has', 'is'].includes(token)));
}

function authoritativeRows(
    graph: SchemaGraph,
    resource: string,
    resources: Readonly<Record<string, ReadonlyArray<MockDataRow>>>,
    existingData: Readonly<Record<string, ExistingMockData>>
): ReadonlyArray<MockDataRow> {
    const initialRows = existingData[resource]?.initialRows;
    if (hasAuthoritativeRows(initialRows)) {
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
    const signature = (row: MockDataRow): string => keySignature(keys, row);
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
        // A descriptive value was verified for its original code only. Reusing it with a protected,
        // previously unseen code would create an unverified pair, so the tuple is reported as a
        // conflict, as when the domain is full, instead of failing the whole service.
        if (relevanceVerifiedDomain && values.some(({ property }) => targetProperties.get(property)?.links?.text)) {
            reportConflict();
            continue;
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
 * Whether a new value-help row is valid for every property of the value-help entity and its planned
 * semantic role.
 *
 * @param targetEntity value-help entity
 * @param row the new value-help row
 * @param classifications planned semantic roles by `EntitySet.Property`
 * @returns true when every property is present and valid
 */
function valueHelpRowIsValid(
    targetEntity: SchemaEntity,
    row: MockDataRow,
    classifications: ReadonlyMap<string, SemanticClassification>
): boolean {
    return targetEntity.properties.every((property) => {
        const role = classifications.get(semanticPropertyKey(targetEntity.entitySetName, property.name))?.role;
        return (
            Object.prototype.hasOwnProperty.call(row, property.name) &&
            propertyValueIsValid(property, row[property.name]) &&
            (!role || role === 'unknown' || semanticValueIsValid(role, property, row[property.name]))
        );
    });
}

/**
 * Whether a new value-help row gives every owner field one value that fits it and keeps its fixed value.
 *
 * @param groups tuple members grouped by the owner field they fill
 * @param row the new value-help row
 * @param fixedValue the value an owner field must keep, if any
 * @param fits whether a value is valid for an owner field
 * @returns true when the owner row can adopt the value-help row unchanged
 */
function cloneFitsOwner(
    groups: ReadonlyArray<ReadonlyArray<ValueListTupleMember>>,
    row: MockDataRow,
    fixedValue: (member: ValueListTupleMember) => JsonValue | undefined,
    fits: (local: SchemaProperty, value: JsonValue | undefined) => boolean
): boolean {
    return groups.every((group) => {
        const value = memberValue(group[0], row);
        const fixed = fixedValue(group[0]);
        return (
            value !== undefined &&
            fits(group[0].localProperty, value) &&
            group.every((member) => sameValue(memberValue(member, row), value)) &&
            (fixed === undefined || sameValue(value, fixed))
        );
    });
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
    const signature = (row: MockDataRow): string => keySignature(keys, row);
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
        if (
            valueHelpRowIsValid(targetEntity, clone, extension.classifications) &&
            cloneFitsOwner(groups, clone, fixedValue, fits) &&
            !signatures.has(signature(clone)) &&
            extension.preservesRelationships(clone)
        ) {
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

/** What value-list projection reads, and where it reports. */
interface ValueListProjectionOptions {
    /** The service schema. */
    graph: SchemaGraph;
    /** The rows to project; they are copied, never mutated. */
    resources: Readonly<Record<string, ReadonlyArray<MockDataRow>>>;
    /** The caller's own rows by entity set. */
    existingData: Readonly<Record<string, ExistingMockData>>;
    /** Receives the unavailable-context and domain-conflict diagnostics. */
    diagnostics: MockDataGeneratorDiagnostic[];
    /** Planned semantic roles by `EntitySet.Property`. */
    classifications: ReadonlyMap<string, SemanticClassification>;
    /** Resource cardinality constraints. */
    targetKinds: ReadonlyMap<string, 'entity-set' | 'singleton'>;
    /** Receives the owner properties whose values were projected, by entity set. */
    projectedProperties: Map<string, Set<string>>;
    /** Value-help resources whose display values the relevance verifier accepted; no row is added to them per owner row. */
    relevanceVerifiedResources: ReadonlySet<string>;
    /** Recomputes format-provider companions of codes after each projection pass. */
    refreshCompanions?: CompanionRefresh;
}

/** Working rows and bindings shared by all passes of one value-list projection. */
interface ProjectionState {
    readonly options: ValueListProjectionOptions;
    /** Mutable copies of the rows, by entity set. */
    readonly generated: Record<string, Array<Record<string, JsonValue>>>;
    /** Properties that take part in a relationship, by entity set. */
    readonly relationshipProperties: ReadonlyMap<string, ReadonlySet<string>>;
    /** Projected owner fields by owner row (see bindingKey). */
    readonly projectedBindings: Map<string, Map<string, ProjectedBinding>>;
    /** Which value lists projected each owner field, so a list is not constrained by its own choice. */
    readonly projectedBy: Map<string, Map<string, Set<string>>>;
    /** Conflicts collected in the current fixed-point pass; only those of the final pass describe the result. */
    pendingConflicts: Map<string, string>;
    /**
     * Owner-side values each value list can supply, per shared field set, sampled during the current pass.
     * Used to prefer tuples that another value list of the same row can agree with.
     */
    supportCache: Map<string, ReadonlySet<string>>;
}

/** One owner entity during a projection pass. */
interface OwnerProjection {
    readonly entity: SchemaEntity;
    /** The owner rows (mutated). */
    readonly rows: Array<Record<string, JsonValue>>;
    readonly properties: ReadonlyMap<string, SchemaProperty>;
    /** Whether the owner rows are the caller's authoritative rows. */
    readonly ownerIsAuthoritative: boolean;
    /** Owner properties that take part in a relationship. */
    readonly relationshipProtected: ReadonlySet<string>;
    /** Whether an owner field keeps its own value. */
    readonly isProtected: (local: SchemaProperty) => boolean;
    /** Whether a value is valid for an owner field: facets and the field's planned semantic role. */
    readonly fits: (local: SchemaProperty, value: JsonValue | undefined) => boolean;
    readonly lists: ReadonlyArray<ProjectionList>;
    /** Failure message per value list, by owner row index, for joint solving. */
    readonly failedRows: Map<number, Map<string, string>>;
}

/** Another value list of the owner entity that determines some of a list's non-key fields. */
interface SharingList {
    other: ProjectionList;
    shared: ReadonlyArray<string>;
}

/** One value list of an owner entity during a projection pass, with what does not depend on the owner row. */
interface ListProjection {
    readonly list: ProjectionList;
    /** Current value-help rows; a generated domain grows while rows are added for owner rows. */
    readonly domain: ReadonlyArray<MockDataRow>;
    readonly sharing: ReadonlyArray<SharingList>;
    /** Owner fields of the InOut parameters. */
    readonly inOutProperties: ReadonlyArray<string>;
    /** The value-help entity a missing tuple may be added to, or undefined when the domain is closed to this list. */
    readonly extensionEntity: SchemaEntity | undefined;
    /** Capacity of the value-help domain. */
    readonly maxRows: number;
    /** Whether a value-help row keeps its outgoing relationships. */
    readonly preservesRelationships: (row: MockDataRow) => boolean;
}

/**
 * The key of an owner row in the projected bindings.
 *
 * @param entitySet owner entity set
 * @param rowIndex owner row index
 * @returns the binding key
 */
function bindingKey(entitySet: string, rowIndex: number): string {
    return `${entitySet}\u0000${rowIndex}`;
}

/**
 * Record a conflict of the current pass; the first message per target wins.
 *
 * @param state projection state
 * @param target `EntitySet.Property` of the owner property
 * @param message conflict description
 */
function reportConflict(state: ProjectionState, target: string, message: string): void {
    if (!state.pendingConflicts.has(target)) {
        state.pendingConflicts.set(target, message);
    }
}

/**
 * Record that a value list projected an owner field.
 *
 * @param state projection state
 * @param entitySet owner entity set
 * @param localProperty owner field
 * @param target `EntitySet.Property` of the value list's owner property
 */
function markProjected(state: ProjectionState, entitySet: string, localProperty: string, target: string): void {
    const { projectedProperties } = state.options;
    const projected = projectedProperties.get(entitySet) ?? new Set<string>();
    projected.add(localProperty);
    projectedProperties.set(entitySet, projected);
    const byProperty = state.projectedBy.get(entitySet) ?? new Map<string, Set<string>>();
    const sources = byProperty.get(localProperty) ?? new Set<string>();
    sources.add(target);
    byProperty.set(localProperty, sources);
    state.projectedBy.set(entitySet, byProperty);
}

/**
 * Whether a value list other than `target` projected an owner field.
 *
 * @param state projection state
 * @param entitySet owner entity set
 * @param localProperty owner field
 * @param target `EntitySet.Property` of the value list asking
 * @returns true when another value list projected the field
 */
function projectedByOther(state: ProjectionState, entitySet: string, localProperty: string, target: string): boolean {
    return [...(state.projectedBy.get(entitySet)?.get(localProperty) ?? [])].some((source) => source !== target);
}

/**
 * The properties that take part in a relationship, as source or target, by entity set.
 *
 * @param graph the service schema
 * @returns new sets of property names by entity set
 */
function relationshipPropertiesByEntitySet(graph: SchemaGraph): Map<string, Set<string>> {
    const relationshipProperties = new Map<string, Set<string>>();
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
    return relationshipProperties;
}

/**
 * A check that a row of a collection keeps its outgoing relationships against the current rows.
 *
 * @param state projection state
 * @param collection the entity set of the row
 * @returns true for a row whose foreign keys are null or reference an existing target row
 */
function outgoingRelationshipCheck(state: ProjectionState, collection: string): (candidate: MockDataRow) => boolean {
    const { graph, existingData } = state.options;
    return (candidate) =>
        generationRelationships(graph)
            .filter(({ fromEntitySet }) => fromEntitySet === collection)
            .every((relationship) => {
                const targetRows = authoritativeRows(graph, relationship.toEntitySet, state.generated, existingData);
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
}

/**
 * Project value-help tuples into owner rows until a fixed point: the owner fields a value list
 * determines take the values of one value-help row, and a generated value-help domain is extended where
 * it lacks an owner's fixed context. Conflicts that remain after the final pass are reported.
 *
 * @param options rows, schema and constraints to project, and where to report
 * @returns the projected rows by entity set, frozen
 */
function projectValueLists(options: ValueListProjectionOptions): Readonly<Record<string, ReadonlyArray<MockDataRow>>> {
    const { graph, resources, diagnostics, refreshCompanions } = options;
    const state: ProjectionState = {
        options,
        generated: Object.fromEntries(
            Object.entries(resources).map(([resource, rows]) => [resource, rows.map((row) => ({ ...row }))])
        ),
        relationshipProperties: relationshipPropertiesByEntitySet(graph),
        projectedBindings: new Map<string, Map<string, ProjectedBinding>>(),
        projectedBy: new Map<string, Map<string, Set<string>>>(),
        pendingConflicts: new Map<string, string>(),
        supportCache: new Map<string, ReadonlySet<string>>()
    };
    const maxPasses = Math.max(1, graph.entities.length + 1);
    for (let pass = 0; pass < maxPasses; pass += 1) {
        let changed = false;
        state.pendingConflicts = new Map<string, string>();
        state.supportCache = new Map<string, ReadonlySet<string>>();
        for (const entity of graph.entities) {
            const rows = state.generated[entity.entitySetName];
            if (rows && projectEntityValueLists(state, entity, rows)) {
                changed = true;
            }
        }
        // Format providers describe codes (currency names, country names, code-list columns). A
        // projected or cloned code must carry its provider values before owners copy them, so the
        // providers take part in the fixed point instead of rewriting value-help rows afterwards.
        if (refreshCompanions && applyCompanions(state.generated, refreshCompanions(state.generated))) {
            changed = true;
        }
        if (!changed) {
            break;
        }
    }
    for (const [target, message] of state.pendingConflicts) {
        pushUniqueDiagnostic(diagnostics, { code: 'SEMANTIC_DOMAIN_CONFLICT', severity: 'warning', target, message });
    }
    return Object.freeze(
        Object.fromEntries(Object.entries(state.generated).map(([resource, rows]) => [resource, freezeRows(rows)]))
    );
}

/**
 * Project the value lists of one owner entity for one pass, then solve its failed rows jointly.
 *
 * @param state projection state
 * @param entity owner entity
 * @param rows owner rows (mutated)
 * @returns true when any owner or value-help row changed
 */
function projectEntityValueLists(
    state: ProjectionState,
    entity: SchemaEntity,
    rows: Array<Record<string, JsonValue>>
): boolean {
    const { graph, existingData } = state.options;
    const owner = ownerProjection(state, entity, rows);
    let changed = false;
    for (const list of owner.lists) {
        if (projectList(state, owner, list)) {
            changed = true;
        }
    }
    // A row whose value lists share fields may need a tuple choice that no list finds on its
    // own (for example a text shared by two lists whose domains agree only on rows that a third
    // list's binding excludes). Such rows are solved jointly over the connected lists.
    const joint = solveFailedRowsJointly(owner.failedRows, rows, owner.lists, {
        domain: (list) => {
            const context = resolveValueListContext(graph, list.collection, state.generated, existingData);
            return context.source === 'unavailable' ? undefined : context.rows;
        },
        adoptable: (list, row, candidate) => tupleIsAdoptable(owner, list, row, candidate),
        adopt: (rowIndex, row, list, selected, jointOwners) =>
            adoptTuple(state, owner, { rowIndex, row, list, selected, jointOwners })
    });
    if (joint.changed) {
        changed = true;
    }
    joint.unresolved.forEach(([target, message]) => reportConflict(state, target, message));
    return changed;
}

/**
 * Describe an owner entity for one projection pass: its fields, which of them are protected, how values
 * are checked against them, and its value lists.
 *
 * @param state projection state
 * @param entity owner entity
 * @param rows owner rows
 * @returns the owner entity as projection sees it
 */
function ownerProjection(
    state: ProjectionState,
    entity: SchemaEntity,
    rows: Array<Record<string, JsonValue>>
): OwnerProjection {
    const { graph, existingData, classifications } = state.options;
    const properties = new Map(entity.properties.map((candidate) => [candidate.name, candidate]));
    const protectedProperties = tupleProtectedProperties(graph, entity, existingData);
    const ownerIsAuthoritative = hasAuthoritativeRows(existingData[entity.entitySetName]?.initialRows);
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
    const lists = entity.properties.flatMap((property): ProjectionList[] => {
        const collection = property.links?.valueListCollection;
        const parameters = effectiveValueListParameters(property);
        if (!collection || parameters.length === 0) {
            return [];
        }
        const context = resolveValueListContext(graph, collection, state.generated, existingData);
        return [
            {
                collection,
                parameters,
                target: `${entity.entitySetName}.${property.name}`,
                members: valueListTupleMembers(property, parameters, properties, context.targetEntity)
            }
        ];
    });
    return {
        entity,
        rows,
        properties,
        ownerIsAuthoritative,
        relationshipProtected: state.relationshipProperties.get(entity.entitySetName) ?? new Set<string>(),
        isProtected: (local) => protectedProperties.has(local.name),
        fits,
        lists,
        failedRows: new Map<number, Map<string, string>>()
    };
}

/**
 * Whether an owner row could adopt a value-help row of a list on its own: the row satisfies the
 * list's constants, every value it carries fits its owner field, it keeps the protected fields, and
 * members filling the same field agree. Unprotected In fields are the row's own context and adopt the
 * tuple's value like InOut fields do.
 *
 * @param owner owner entity
 * @param list the value list
 * @param row owner row
 * @param candidate value-help row
 * @returns true when the tuple is compatible with the owner row
 */
function tupleIsAdoptable(
    owner: OwnerProjection,
    list: ProjectionList,
    row: MockDataRow,
    candidate: MockDataRow
): boolean {
    return (
        list.parameters.every(
            ({ constant, valueListProperty }) =>
                constant === undefined || sameValue(candidate[valueListProperty ?? ''], constant)
        ) &&
        list.members.every((member) => {
            const value = memberValue(member, candidate);
            return (
                owner.fits(member.localProperty, value) &&
                (!owner.isProtected(member.localProperty) || sameValue(row[member.localProperty.name], value))
            );
        }) &&
        membersAgree(list.members, candidate)
    );
}

/** A tuple chosen for an owner row. */
interface TupleAdoption {
    rowIndex: number;
    /** Owner row (mutated). */
    row: Record<string, JsonValue>;
    /** The value list whose tuple is adopted. */
    list: ProjectionList;
    /** The value-help row. */
    selected: MockDataRow;
    /**
     * For a joint choice, the value list that owns each field's binding; the choice then replaces
     * existing bindings. Without it, a field bound by another value list is left unchanged.
     */
    jointOwners?: ReadonlyMap<string, string>;
}

/**
 * Write a selected tuple into an owner row and record the bindings it establishes.
 *
 * @param state projection state
 * @param owner owner entity
 * @param adoption the owner row and the tuple chosen for it
 * @returns true when the row changed
 */
function adoptTuple(state: ProjectionState, owner: OwnerProjection, adoption: TupleAdoption): boolean {
    const { rowIndex, row, list, selected, jointOwners } = adoption;
    const entitySet = owner.entity.entitySetName;
    let rowChanged = false;
    const key = bindingKey(entitySet, rowIndex);
    const bindings = state.projectedBindings.get(key) ?? new Map<string, ProjectedBinding>();
    for (const member of list.members) {
        const local = member.localProperty;
        const value = memberValue(member, selected);
        if (value === undefined || !owner.fits(local, value)) {
            continue;
        }
        const binding = bindings.get(local.name);
        const ownedElsewhere = jointOwners === undefined && binding !== undefined && binding.owner !== list.target;
        if (!owner.isProtected(local) && !ownedElsewhere && !sameValue(row[local.name], value)) {
            row[local.name] = value;
            rowChanged = true;
            if (member.direction === 'In' || member.display) {
                markProjected(state, entitySet, local.name, list.target);
            }
        }
        if (!member.display && member.direction !== 'In') {
            markProjected(state, entitySet, local.name, list.target);
        }
        if (!ownedElsewhere) {
            bindings.set(local.name, {
                value: row[local.name],
                owner: jointOwners?.get(local.name) ?? list.target
            });
        }
    }
    if (bindings.size > 0) {
        state.projectedBindings.set(key, bindings);
    }
    return rowChanged;
}

/**
 * The owner-side values a value list can supply for a set of shared fields, sampled once per pass.
 *
 * @param state projection state
 * @param owner owner entity
 * @param list the value list
 * @param shared owner fields the list shares with another list
 * @returns JSON-encoded value tuples, or undefined when the list's context is unavailable
 */
function supportFor(
    state: ProjectionState,
    owner: OwnerProjection,
    list: ProjectionList,
    shared: ReadonlyArray<string>
): ReadonlySet<string> | undefined {
    const cacheKey = `${list.target}\u0000${shared.join('\u0000')}`;
    const cached = state.supportCache.get(cacheKey);
    if (cached) {
        return cached;
    }
    const { graph, existingData } = state.options;
    const context = resolveValueListContext(graph, list.collection, state.generated, existingData);
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
                const local = owner.properties.get(shared[index]);
                return local !== undefined && owner.fits(local, value);
            })
        ) {
            keys.add(JSON.stringify(values));
        }
    }
    state.supportCache.set(cacheKey, keys);
    return keys;
}

/**
 * Project one value list into every owner row: extend a generated domain with the protected tuples
 * first, then choose a tuple per row.
 *
 * @param state projection state
 * @param owner owner entity (its rows and failed rows are updated)
 * @param list the value list
 * @returns true when any owner or value-help row changed
 */
function projectList(state: ProjectionState, owner: OwnerProjection, list: ProjectionList): boolean {
    const { graph, existingData, classifications, targetKinds, relevanceVerifiedResources, diagnostics } =
        state.options;
    const { collection, parameters, target, members } = list;
    const context = resolveValueListContext(graph, collection, state.generated, existingData);
    if (context.source === 'unavailable') {
        pushUniqueDiagnostic(diagnostics, {
            code: 'SEMANTIC_TUPLE_CONTEXT_UNAVAILABLE',
            severity: 'warning',
            target,
            message: `Value-list collection ${collection} is unavailable; tuple projection was skipped.`
        });
        return false;
    }
    let changed = false;
    const entitySet = owner.entity.entitySetName;
    const extensible =
        context.source === 'generated' && context.targetEntity !== undefined && !owner.ownerIsAuthoritative;
    const maxRows = targetKinds.get(collection) === 'singleton' ? 1 : MAX_ROWS_PER_ENTITY;
    const preservesRelationships = outgoingRelationshipCheck(state, collection);
    if (extensible && context.targetEntity) {
        const extended = extendGeneratedValueListDomain(
            owner.rows,
            state.generated[collection] ?? [],
            context.targetEntity,
            parameters,
            owner.properties,
            (local) =>
                local.isKey ||
                owner.relationshipProtected.has(local.name) ||
                projectedByOther(state, entitySet, local.name, target),
            classifications,
            maxRows,
            relevanceVerifiedResources.has(collection),
            preservesRelationships,
            () =>
                reportConflict(
                    state,
                    target,
                    'Generated value-list domain capacity or constraints prevent preserving all protected tuples.'
                )
        );
        if (extended) {
            changed = true;
        }
    }
    // A declared enumeration is its own closed domain: a generated value help that lacks
    // the enumerated value is a schema conflict, not a gap to fill.
    const enumerationPinned = members.some(
        ({ localProperty }) => localProperty.enumValues !== undefined && owner.isProtected(localProperty)
    );
    const projection: ListProjection = {
        list,
        domain: context.rows,
        sharing: sharingLists(owner, list),
        inOutProperties: parameters.flatMap(({ direction, localProperty }) =>
            direction === 'InOut' && localProperty ? [localProperty] : []
        ),
        extensionEntity:
            extensible && !enumerationPinned && !relevanceVerifiedResources.has(collection)
                ? context.targetEntity
                : undefined,
        maxRows,
        preservesRelationships
    };
    for (const [rowIndex, row] of owner.rows.entries()) {
        if (projectRow(state, owner, projection, rowIndex, row)) {
            changed = true;
        }
    }
    return changed;
}

/**
 * The other value lists of the owner entity that determine one of a list's non-key fields.
 *
 * @param owner owner entity
 * @param list the value list
 * @returns each sharing list with the owner fields it shares
 */
function sharingLists(owner: OwnerProjection, list: ProjectionList): SharingList[] {
    const locals = new Set(list.members.map(({ localProperty }) => localProperty.name));
    return owner.lists.flatMap((other) => {
        if (other === list) {
            return [];
        }
        const shared = [...new Set(other.members.map(({ localProperty }) => localProperty.name))].filter(
            (name) => locals.has(name) && !owner.properties.get(name)?.isKey
        );
        return shared.length > 0 ? [{ other, shared }] : [];
    });
}

/**
 * Choose a tuple of a value list for one owner row and adopt it. When no value-help row fits, a row
 * carrying the owner's fixed context may be added to an open generated domain; otherwise the failure
 * is recorded for joint solving.
 *
 * @param state projection state
 * @param owner owner entity
 * @param projection the value list and what does not depend on the row
 * @param rowIndex owner row index
 * @param row owner row (mutated)
 * @returns true when the owner row or the value-help domain changed
 */
function projectRow(
    state: ProjectionState,
    owner: OwnerProjection,
    projection: ListProjection,
    rowIndex: number,
    row: Record<string, JsonValue>
): boolean {
    const { list } = projection;
    const rowBindings = state.projectedBindings.get(bindingKey(owner.entity.entitySetName, rowIndex));
    const foreignBinding = (member: ValueListTupleMember): ProjectedBinding | undefined => {
        const binding = rowBindings?.get(member.localProperty.name);
        return binding !== undefined && binding.owner !== list.target ? binding : undefined;
    };
    const compatible = projection.domain.filter((candidate) => tupleIsAdoptable(owner, list, row, candidate));
    const boundMembers = list.members.filter(
        (member) => !owner.isProtected(member.localProperty) && foreignBinding(member) !== undefined
    );
    const agreesWithBindings = (candidate: MockDataRow): boolean =>
        boundMembers.every((member) => sameValue(foreignBinding(member)?.value, memberValue(member, candidate)));
    const base = boundMembers.length > 0 ? compatible.filter(agreesWithBindings) : compatible;
    const candidatePool = rowCandidatePool(state, owner, projection, row, rowBindings, base);
    let changed = false;
    let selected: MockDataRow | undefined = candidatePool[rowIndex % candidatePool.length];
    if (!selected && projection.extensionEntity) {
        selected = extendValueListForRow({
            ownerRow: row,
            rowIndex,
            domain: state.generated[list.collection] ?? [],
            targetEntity: projection.extensionEntity,
            parameters: list.parameters,
            members: list.members,
            fixedValue: (member) =>
                owner.isProtected(member.localProperty)
                    ? row[member.localProperty.name]
                    : foreignBinding(member)?.value,
            fits: owner.fits,
            classifications: state.options.classifications,
            maxRows: projection.maxRows,
            preservesRelationships: projection.preservesRelationships
        });
        if (selected) {
            changed = true;
        }
    }
    if (!selected) {
        const failures = owner.failedRows.get(rowIndex) ?? new Map<string, string>();
        failures.set(
            list.target,
            boundMembers.length > 0 && compatible.length > 0
                ? 'Value-help tuples conflict with an earlier projected application binding; the earlier binding was preserved.'
                : 'Value-help and relationship constraints have no compatible row; authoritative assignments were preserved.'
        );
        owner.failedRows.set(rowIndex, failures);
        return changed;
    }
    return adoptTuple(state, owner, { rowIndex, row, list, selected }) || changed;
}

/**
 * Narrow the compatible tuples of an owner row to the preferred ones: those that keep a current
 * binding or authored value of the InOut fields, and those every other value list sharing a field of
 * the row can agree with.
 *
 * @param state projection state
 * @param owner owner entity
 * @param projection the value list and what does not depend on the row
 * @param row owner row
 * @param rowBindings projected bindings of the row
 * @param base tuples compatible with the row and its foreign bindings
 * @returns the tuples to choose from
 */
function rowCandidatePool(
    state: ProjectionState,
    owner: OwnerProjection,
    projection: ListProjection,
    row: MockDataRow,
    rowBindings: ReadonlyMap<string, ProjectedBinding> | undefined,
    base: ReadonlyArray<MockDataRow>
): ReadonlyArray<MockDataRow> {
    const { list, inOutProperties, sharing } = projection;
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
        generatedBindingIsCurrent || owner.ownerIsAuthoritative
            ? base.filter((candidate) =>
                  list.parameters.every(
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
            const support = supportFor(state, owner, other, shared);
            if (!support) {
                return true;
            }
            const values = shared.map((name) => {
                const member = list.members.find(({ localProperty }) => localProperty.name === name);
                if (member && owner.isProtected(member.localProperty)) {
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
    return candidatePool;
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
                compareCodePoints(left.relationship.fromEntitySet, right.relationship.fromEntitySet)
        )[0]?.relationship;
}

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
                ({ isKey, name }) => isKey && !DRAFT_KEY_PROPERTY_NAMES.has(name.toLowerCase())
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
                compareCodePoints(left.child.entitySetName, right.child.entitySetName)
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
        const signatures = new Set(childRows.map((row) => keySignature(keys, row)));
        if (signatures.size !== childRows.length) {
            generated[relationship.fromEntitySet] = original;
        }
    }
    return Object.freeze(
        Object.fromEntries(Object.entries(generated).map(([resource, rows]) => [resource, freezeRows(rows)]))
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
        Object.fromEntries(Object.entries(generated).map(([resource, rows]) => [resource, freezeRows(rows)]))
    );
}

/**
 * The properties coherence rules must not change, by entity set: relationship ends, keys, enumerated
 * properties, and every property of an entity whose rows the caller authored.
 *
 * @param graph the service schema
 * @param existingData the caller's own rows by entity set
 * @returns new sets of protected property names by entity set
 */
function coherenceProtectedProperties(
    graph: SchemaGraph,
    existingData: Readonly<Record<string, ExistingMockData>>
): Map<string, Set<string>> {
    const protectedProperties = relationshipPropertiesByEntitySet(graph);
    for (const entity of graph.entities) {
        const fixed = protectedProperties.get(entity.entitySetName) ?? new Set<string>();
        entity.properties.filter(isKeyOrEnumerated).forEach(({ name }) => fixed.add(name));
        protectedProperties.set(entity.entitySetName, fixed);
        const initialRows = existingData[entity.entitySetName]?.initialRows;
        if (hasAuthoritativeRows(initialRows)) {
            const protectedSet = protectedProperties.get(entity.entitySetName) ?? new Set<string>();
            entity.properties.forEach(({ name }) => protectedSet.add(name));
            protectedProperties.set(entity.entitySetName, protectedSet);
        }
    }
    return protectedProperties;
}

/** The generated world to finalize, and what finalization reads and reports. */
export interface SemanticServiceWorldFinalization {
    /** The service schema. */
    graph: SchemaGraph;
    /** The rows after the deterministic and SFT tiers. */
    resources: Readonly<Record<string, ReadonlyArray<MockDataRow>>>;
    /** The caller's own rows by entity set. */
    existingData: Readonly<Record<string, ExistingMockData>>;
    /** Seed of the coherence rules. */
    seed: number;
    /** Planned semantic roles by `EntitySet.Property`; none by default. */
    classifications?: ReadonlyMap<string, SemanticClassification>;
    /** Receives the diagnostics of finalization. */
    diagnostics?: MockDataGeneratorDiagnostic[];
    /** Explicit coherence rules by entity set. */
    coherence?: Readonly<Record<string, readonly SyntheticCoherenceRule[]>>;
    /** Resource cardinality constraints. */
    targetKinds?: ReadonlyMap<string, 'entity-set' | 'singleton'>;
    /** Explicit field ordering overrides. */
    temporalConstraints?: readonly TemporalConstraint[];
    /** Resources whose display values the relevance verifier accepted. */
    relevanceVerifiedResources?: ReadonlySet<string>;
    /**
     * Receives the properties whose values were projected from a related entity or from a code in the
     * same row, so the caller can attribute those cells to the tier that supplied them rather than to the
     * deterministic sweep that filled them first.
     */
    projectedProperties?: Map<string, Set<string>>;
    /**
     * Recomputes format-provider companions of codes; applied after every value-list projection pass so
     * owners copy the companions of the final value-help codes.
     */
    refreshCompanions?: CompanionRefresh;
    /** Display locale of the record names of codes; English by default. */
    locale?: string;
    /** Receives the properties rewritten with texts that a record, a supplied row or a fixed cell names. */
    codeTextProperties?: Map<string, Set<string>>;
    /** The host's sample dataset, whose role samples take precedence when place fields are redrawn. */
    sampleDataset?: SyntheticSampleDataset;
}

/**
 * Re-run deterministic invariants after SFT and derive fields from the final relationship world.
 *
 * @param world the rows to finalize and what finalization reads and reports
 * @returns the final, frozen rows by entity set
 */
export function finalizeSemanticServiceWorld(
    world: SemanticServiceWorldFinalization
): Readonly<Record<string, ReadonlyArray<MockDataRow>>> {
    const {
        graph,
        resources,
        existingData,
        seed,
        classifications = new Map<string, SemanticClassification>(),
        diagnostics = [],
        coherence = {},
        targetKinds = new Map<string, 'entity-set' | 'singleton'>(),
        temporalConstraints = [],
        relevanceVerifiedResources = new Set<string>(),
        projectedProperties = new Map<string, Set<string>>(),
        refreshCompanions,
        locale,
        codeTextProperties = new Map<string, Set<string>>(),
        sampleDataset
    } = world;
    const protectedProperties = coherenceProtectedProperties(graph, existingData);
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
    // Owners copy the texts of value-help codes, so every code carries one text before projection.
    const textual = reconcileCodeTexts({
        graph,
        resources: temporallyOrdered,
        existingData,
        classifications,
        locale
    });
    for (const [resource, properties] of textual.named) {
        const received = codeTextProperties.get(resource) ?? new Set<string>();
        properties.forEach((property) => received.add(property));
        codeTextProperties.set(resource, received);
    }
    const projected = projectValueLists({
        graph,
        resources: textual.resources,
        existingData,
        diagnostics,
        classifications,
        targetKinds,
        projectedProperties,
        relevanceVerifiedResources,
        refreshCompanions
    });
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
                if (hasAuthoritativeRows(initialRows)) {
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
    const related = deriveRelationshipFields(graph, aligned, existingData, diagnostics, classifications);
    // Countries arrive through references and value lists after the place fields were drawn, so the place
    // fields follow the final country of each row.
    return anchorRowGeography({
        graph,
        resources: related,
        existingData,
        classifications,
        seed,
        projectedProperties,
        sampleDataset
    }).resources;
}
