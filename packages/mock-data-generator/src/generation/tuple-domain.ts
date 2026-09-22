import type { ExistingMockData, JsonValue, MockDataGeneratorDiagnostic, MockDataRow } from '../types.js';
import type { SchemaEntity, SchemaGraph, SchemaProperty, SchemaValueListParameter } from '../schema/graph.js';
import { propertyValueIsValid } from './constraints.js';
import { semanticValueIsValid } from './semantic-plan.js';
import {
    memberValue,
    resolveValueListContext,
    tupleProtectedProperties,
    valueListDisplayLinks,
    valueListTupleMembers
} from './value-list-context.js';
import type { ValueListTupleMember } from './value-list-context.js';
import { sharingComponent, solveTupleChoice } from './tuple-solver.js';

function sameValue(left: JsonValue | undefined, right: JsonValue | undefined): boolean {
    return Object.is(left, right) || JSON.stringify(left) === JSON.stringify(right);
}

function satisfiesConstants(parameters: ReadonlyArray<SchemaValueListParameter>, candidate: MockDataRow): boolean {
    return parameters.every(
        ({ constant, valueListProperty }) =>
            constant === undefined || sameValue(valueListProperty ? candidate[valueListProperty] : undefined, constant)
    );
}

/**
 * A resolved value list of one owner property whose tuple membership can be checked.
 */
interface CheckedValueList {
    target: string;
    collection: string;
    parameters: ReadonlyArray<SchemaValueListParameter>;
    members: ReadonlyArray<ValueListTupleMember>;
    domain: ReadonlyArray<MockDataRow>;
}

function isMember(list: CheckedValueList, row: MockDataRow, candidate: MockDataRow): boolean {
    return (
        satisfiesConstants(list.parameters, candidate) &&
        list.members.every(
            (member) =>
                propertyValueIsValid(member.localProperty, row[member.localProperty.name]) &&
                sameValue(row[member.localProperty.name], memberValue(member, candidate))
        )
    );
}

/**
 * Whether a value can be held by an owner field: its facets and, when the field has a planned
 * semantic role, that role's format.
 */
type FieldFit = (local: SchemaProperty, value: JsonValue | undefined) => boolean;

/**
 * Whether the owner row could adopt a value-help tuple without rewriting a protected field: the
 * tuple satisfies the list's constants, every value it carries fits its local field, members that
 * fill the same field carry the same value, and it agrees with the row on every protected field.
 *
 * @param list value list
 * @param row owner row
 * @param candidate value-help row
 * @param protectedProperties protected owner fields
 * @param fits whether a value fits an owner field
 * @returns true when the tuple can be adopted
 */
function isAdoptable(
    list: CheckedValueList,
    row: MockDataRow,
    candidate: MockDataRow,
    protectedProperties: ReadonlySet<string>,
    fits: FieldFit
): boolean {
    const carried = new Map<string, JsonValue>();
    return (
        satisfiesConstants(list.parameters, candidate) &&
        list.members.every((member) => {
            const value = memberValue(member, candidate);
            const name = member.localProperty.name;
            if (value === undefined || !fits(member.localProperty, value)) {
                return false;
            }
            if (carried.has(name) && !sameValue(carried.get(name), value)) {
                return false;
            }
            carried.set(name, value);
            return !protectedProperties.has(name) || sameValue(row[name], value);
        })
    );
}

/**
 * Whether the owner row can be a member of `list` and, at the same time, of every other value list
 * connected to it through shared fields, choosing one adoptable tuple per list so that each shared
 * field receives one value. An exhausted search is treated as satisfiable, so an undecided row is
 * reported as a membership failure rather than excused as a conflict.
 *
 * @param list value list whose membership failed
 * @param lists every value list of the owner entity whose value-help rows are available
 * @param row owner row
 * @param protectedProperties protected owner fields
 * @param fits whether a value fits an owner field
 * @returns true when a jointly compatible choice exists (or could not be ruled out)
 */
function hasJointlyCompatibleTuple(
    list: CheckedValueList,
    lists: ReadonlyArray<CheckedValueList>,
    row: MockDataRow,
    protectedProperties: ReadonlySet<string>,
    fits: FieldFit
): boolean {
    const component = sharingComponent(list, lists);
    const outcome = solveTupleChoice(
        component.map((member) => ({
            id: member.target,
            members: member.members,
            candidates: member.domain.filter((candidate) =>
                isAdoptable(member, row, candidate, protectedProperties, fits)
            )
        }))
    );
    return outcome.status !== 'unsatisfiable';
}

/**
 * Resolve the value lists of an entity, reporting unavailable context.
 *
 * `checked` holds the lists whose membership can be validated. `constraints` holds every list whose
 * value-help rows are available, including lists whose display text cannot be resolved: generation
 * still projects their parameters, so they constrain the fields they share with checked lists.
 *
 * @param graph schema graph
 * @param entity owner entity
 * @param resources generated rows by resource
 * @param existingData authored data by resource
 * @param add diagnostic sink
 * @returns the checkable value lists and the lists that constrain shared fields
 */
function checkedValueLists(
    graph: SchemaGraph,
    entity: SchemaEntity,
    resources: Readonly<Record<string, ReadonlyArray<MockDataRow>>>,
    existingData: Readonly<Record<string, ExistingMockData>>,
    add: (diagnostic: MockDataGeneratorDiagnostic) => void
): { checked: ReadonlyArray<CheckedValueList>; constraints: ReadonlyArray<CheckedValueList> } {
    const properties = new Map(entity.properties.map((property) => [property.name, property]));
    const lists: CheckedValueList[] = [];
    const constraints: CheckedValueList[] = [];
    for (const owner of entity.properties) {
        const collection = owner.links?.valueListCollection;
        const parameters = owner.links?.valueListParameters ?? [];
        if (!collection || parameters.length === 0) {
            continue;
        }
        const target = `${entity.entitySetName}.${owner.name}`;
        const context = resolveValueListContext(graph, collection, resources, existingData);
        if (context.source === 'unavailable') {
            add({
                code: 'SEMANTIC_TUPLE_CONTEXT_UNAVAILABLE',
                severity: 'warning',
                target,
                message: `Value-list context ${collection} is unavailable; tuple membership was not validated.`
            });
            continue;
        }
        const domain = context.rows;
        let completeContext = true;
        for (const parameter of parameters) {
            if (parameter.localProperty && !properties.has(parameter.localProperty)) {
                completeContext = false;
                add({
                    code: 'SEMANTIC_TUPLE_CONTEXT_UNAVAILABLE',
                    severity: 'warning',
                    target,
                    message: `Value-list parameter references missing local property ${parameter.localProperty}; tuple membership was not validated.`
                });
            }
            if (
                parameter.localProperty &&
                parameter.direction !== 'DisplayOnly' &&
                parameter.valueListProperty === undefined &&
                parameter.constant === undefined
            ) {
                completeContext = false;
                add({
                    code: 'SEMANTIC_TUPLE_CONTEXT_UNAVAILABLE',
                    severity: 'warning',
                    target,
                    message: `Value-list parameter for local property ${parameter.localProperty} names no value-list property; tuple membership was not validated.`
                });
            }
            const valueListProperty = parameter.valueListProperty;
            if (valueListProperty && domain.some((row) => !(valueListProperty in row))) {
                completeContext = false;
                add({
                    code: 'SEMANTIC_TUPLE_CONTEXT_UNAVAILABLE',
                    severity: 'warning',
                    target,
                    message: `Authored value-list rows do not expose ${parameter.valueListProperty}; tuple membership was not validated.`
                });
            }
        }
        const displayLinks = valueListDisplayLinks(owner, parameters, properties, context.targetEntity);
        if (owner.links?.text && displayLinks.length === 0) {
            completeContext = false;
            add({
                code: 'SEMANTIC_TUPLE_CONTEXT_UNAVAILABLE',
                severity: 'warning',
                target,
                message: `Value-list key text link for ${owner.links.text} could not be resolved; tuple membership was not validated.`
            });
        }
        for (const link of displayLinks) {
            if (domain.some((row) => !(link.targetTextProperty.name in row))) {
                completeContext = false;
                add({
                    code: 'SEMANTIC_TUPLE_CONTEXT_UNAVAILABLE',
                    severity: 'warning',
                    target,
                    message: `Value-list rows do not expose ${link.targetTextProperty.name}; tuple membership was not validated.`
                });
            }
        }
        const list: CheckedValueList = {
            target,
            collection,
            parameters,
            members: valueListTupleMembers(owner, parameters, properties, context.targetEntity),
            domain
        };
        constraints.push(list);
        if (completeContext) {
            lists.push(list);
        }
    }
    return { checked: lists, constraints };
}

/**
 * Validate final/cache rows against authored value-list tuples.
 *
 * A non-enumerable contributor is deliberately reported as unavailable: its
 * contents cannot be independently checked and therefore cannot count as a
 * successful domain validation.
 *
 * A row that is not a member of a tuple is classified by whether membership was attainable:
 * - `SEMANTIC_DOMAIN_CONFLICT` when no value-help tuple can be adopted without rewriting a
 *   protected field (key, enumeration, relationship field, authored row), without violating the
 *   list's constants or the local facets, or without breaking another value list of the same row
 *   that shares a field (no choice of one tuple per list agrees on the shared fields). The authoritative
 *   assignment is preserved and the conflict is reported.
 * - `SEMANTIC_TUPLE_MEMBERSHIP_INVALID` otherwise: a compatible tuple existed and generation (or
 *   the cache) failed to use it.
 *
 * A value is adoptable only when it fits its owner field's facets and, when `semanticRoles` names
 * a role for the field, that role's format: generation never writes a value that semantic
 * validation would reject, so such tuples cannot make a row a member.
 *
 * @param graph schema graph
 * @param resources final rows by resource
 * @param existingData authored data by resource
 * @param semanticRoles planned semantic role by `EntitySet.Property`, when known
 * @returns tuple diagnostics, at most one per code and target
 */
export function validateTupleDomains(
    graph: SchemaGraph,
    resources: Readonly<Record<string, ReadonlyArray<MockDataRow>>>,
    existingData: Readonly<Record<string, ExistingMockData>>,
    semanticRoles: Readonly<Record<string, string>> = {}
): ReadonlyArray<MockDataGeneratorDiagnostic> {
    const diagnostics: MockDataGeneratorDiagnostic[] = [];
    const add = (diagnostic: MockDataGeneratorDiagnostic): void => {
        if (!diagnostics.some((item) => item.code === diagnostic.code && item.target === diagnostic.target)) {
            diagnostics.push(diagnostic);
        }
    };
    for (const entity of graph.entities) {
        const rows = resources[entity.entitySetName] ?? [];
        if (rows.length === 0) {
            continue;
        }
        const { checked: lists, constraints } = checkedValueLists(graph, entity, resources, existingData, add);
        if (lists.length === 0) {
            continue;
        }
        const protectedProperties = tupleProtectedProperties(graph, entity, existingData);
        const fits: FieldFit = (local, value) => {
            if (!propertyValueIsValid(local, value)) {
                return false;
            }
            const role = semanticRoles[`${entity.entitySetName}.${local.name}`];
            return !role || role === 'unknown' || semanticValueIsValid(role, local, value);
        };
        for (const list of lists) {
            for (const row of rows) {
                if (list.domain.some((candidate) => isMember(list, row, candidate))) {
                    continue;
                }
                const adoptable = list.domain.some((candidate) =>
                    isAdoptable(list, row, candidate, protectedProperties, fits)
                );
                if (!adoptable) {
                    const protectedMembers = list.members.some(({ localProperty }) =>
                        protectedProperties.has(localProperty.name)
                    );
                    add({
                        code: 'SEMANTIC_DOMAIN_CONFLICT',
                        severity: 'warning',
                        target: list.target,
                        message: protectedMembers
                            ? `Protected assignments in final row ${entity.entitySetName} have no compatible value-list tuple ${list.collection}.`
                            : `Value-list tuple ${list.collection} has no row that satisfies its constants and fits the fields of ${entity.entitySetName}.`
                    });
                    continue;
                }
                if (!hasJointlyCompatibleTuple(list, constraints, row, protectedProperties, fits)) {
                    add({
                        code: 'SEMANTIC_DOMAIN_CONFLICT',
                        severity: 'warning',
                        target: list.target,
                        message: `Value-list tuple ${list.collection} has no row that agrees with the other value lists sharing fields of ${entity.entitySetName}.`
                    });
                    continue;
                }
                add({
                    code: 'SEMANTIC_TUPLE_MEMBERSHIP_INVALID',
                    severity: 'warning',
                    target: list.target,
                    message: `Final row ${entity.entitySetName} is not a member of value-list tuple ${list.collection}.`
                });
            }
        }
    }
    return diagnostics;
}
