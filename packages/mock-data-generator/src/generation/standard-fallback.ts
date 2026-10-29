import type { SchemaEntity, SchemaGraph, SchemaProperty } from '../schema/graph.js';
import type { ExistingMockData, JsonValue, MockDataRow } from '../types.js';
import { generatedRowFlags } from './authored.js';
import { codeTextPairs } from './code-texts.js';
import { propertyValueIsValid } from './constraints.js';
import { protectedPropertyNames, sameValue } from './rows.js';
import {
    memberValue,
    resolveValueListContext,
    tupleProtectedProperties,
    valueListTupleMembers
} from './value-list-context.js';
import type { ValueListTupleMember } from './value-list-context.js';
import { standardFallbackValue } from '../spec/standard-mockserver.js';
import { semanticPropertyKey } from '../semantics/classifier.js';
import { undoChangesBreakingFinalChecks } from './final-checks.js';
import { semanticValueIsValid } from './semantic-plan.js';

/** The rows after the fallback and how many cells it filled. */
export interface StandardFallbackResult {
    resources: Readonly<Record<string, ReadonlyArray<MockDataRow>>>;
    filled: number;
}

/** A value list of an owner property, with the owner fields its value-help rows determine. */
interface OwnedValueList {
    entity: SchemaEntity;
    collection: string;
    members: ReadonlyArray<ValueListTupleMember>;
    constants: ReadonlyArray<Readonly<{ valueListProperty: string; constant: JsonValue }>>;
    /** Owner fields another value list of the same entity set also determines. */
    shared: ReadonlySet<string>;
}

/**
 * Fill the generated string cells that no tier gave a value (null or the empty string) the way the standard
 * mock server does ({@link standardFallbackValue}). It runs last, after every other tier, the realism guard
 * and the coherence rules: a value it writes says plainly that nothing knew what the field holds.
 *
 * The fallback keeps the relations of the service intact:
 * - the text of a code takes the index of the first row with the same code, so each code keeps one text;
 * - an owner field a value list determines is not invented but copied from the value-help row that matches
 *   the owner row, so the row stays a member of its value-list tuple;
 * - supplied rows, keys, declared enumerations and relationship ends are never changed, and a value-help
 *   column whose owner field cannot follow it is left as it is.
 *
 * A value the field's facets or its planned semantic role reject is not written: a URL, phone or code field
 * that no tier filled stays empty rather than hold a name and a number. An owner field that several value
 * lists determine is left as it is, with the value-help columns it reads, since the lists may disagree.
 * Whatever still makes a final semantic or value-list check fail that passed before is undone
 * ({@link undoChangesBreakingFinalChecks}), so the fallback never aborts a generation.
 *
 * @param graph service schema
 * @param resources the final rows
 * @param existingData the caller's existing rows
 * @param roles planned semantic roles by field
 * @returns the rows and the number of filled cells
 */
export function applyStandardFallback(
    graph: SchemaGraph,
    resources: Readonly<Record<string, ReadonlyArray<MockDataRow>>>,
    existingData: Readonly<Record<string, ExistingMockData>>,
    roles: Readonly<Record<string, string>>
): StandardFallbackResult {
    const lists = ownedValueLists(graph, existingData);
    const held = heldPropertyNames(graph, lists, existingData);
    const fits = (entity: SchemaEntity, property: SchemaProperty, value: JsonValue): boolean => {
        const role = roles[semanticPropertyKey(entity.entitySetName, property.name)];
        return propertyValueIsValid(property, value) && (!role || semanticValueIsValid(role, property, value));
    };
    const output: Record<string, ReadonlyArray<MockDataRow>> = { ...resources };
    let filled = 0;
    for (const entity of graph.entities) {
        const rows = resources[entity.entitySetName];
        if (rows === undefined) {
            continue;
        }
        const generated = generatedRowFlags(entity, rows, existingData);
        const codeOf = new Map(codeTextPairs(entity).map(({ code, text }) => [text.name, code.name]));
        const excluded = held.get(entity.entitySetName) ?? new Set<string>();
        const fillable = entity.properties.filter(
            (property) => property.primitiveType === 'string' && !excluded.has(property.name)
        );
        const replacements = new Map<number, Record<string, JsonValue>>();
        for (const property of fillable) {
            const code = codeOf.get(property.name);
            const firstRowOfCode = new Map<string, number>();
            rows.forEach((row, index) => {
                const key = code === undefined ? undefined : JSON.stringify(row[code] ?? null);
                if (key !== undefined && !firstRowOfCode.has(key)) {
                    firstRowOfCode.set(key, index);
                }
            });
            for (const [index, row] of rows.entries()) {
                if (!generated[index] || !isEmpty(row[property.name])) {
                    continue;
                }
                const ordinal =
                    code === undefined ? index : (firstRowOfCode.get(JSON.stringify(row[code] ?? null)) ?? index);
                const value = standardFallbackValue(property, ordinal);
                if (value !== undefined && fits(entity, property, value)) {
                    replacements.set(index, { ...replacements.get(index), [property.name]: value });
                    filled += 1;
                }
            }
        }
        output[entity.entitySetName] = withReplacements(rows, replacements);
    }
    // A value-help row may itself receive a copy from its own value help, so copying repeats until nothing
    // changes. Each pass only fills empty cells, so there are at most as many productive passes as lists.
    for (let pass = 0; pass <= lists.length; pass++) {
        let copiedInPass = 0;
        for (const list of lists) {
            const rows = output[list.entity.entitySetName];
            if (rows === undefined) {
                continue;
            }
            const copied = copyFromValueHelp(graph, list, rows, output, existingData, fits);
            output[list.entity.entitySetName] = copied.rows;
            copiedInPass += copied.filled;
        }
        filled += copiedInPass;
        if (copiedInPass === 0) {
            break;
        }
    }
    const checked = undoChangesBreakingFinalChecks(graph, resources, output, existingData, roles);
    return { resources: checked.resources, filled: filled - checked.reverted };
}

/**
 * Copy the empty owner string fields a value list determines from the value-help row that agrees with the
 * owner row on the list's constants and on every member the owner row already holds.
 *
 * @param graph service schema
 * @param list the value list
 * @param rows the owner rows
 * @param resources the rows so far, which include the value-help rows
 * @param existingData the caller's existing rows
 * @param fits whether a value fits a field's facets and planned role
 * @returns the owner rows and the number of copied cells
 */
function copyFromValueHelp(
    graph: SchemaGraph,
    list: OwnedValueList,
    rows: ReadonlyArray<MockDataRow>,
    resources: Readonly<Record<string, ReadonlyArray<MockDataRow>>>,
    existingData: Readonly<Record<string, ExistingMockData>>,
    fits: (entity: SchemaEntity, property: SchemaProperty, value: JsonValue) => boolean
): { rows: ReadonlyArray<MockDataRow>; filled: number } {
    const context = resolveValueListContext(graph, list.collection, resources, existingData);
    if (context.source === 'unavailable') {
        return { rows, filled: 0 };
    }
    const generated = generatedRowFlags(list.entity, rows, existingData);
    const replacements = new Map<number, Record<string, JsonValue>>();
    let filled = 0;
    rows.forEach((row, index) => {
        const empty = list.members.filter(
            ({ localProperty }) =>
                localProperty.primitiveType === 'string' &&
                !list.shared.has(localProperty.name) &&
                isEmpty(row[localProperty.name])
        );
        if (!generated[index] || empty.length === 0) {
            return;
        }
        const match = context.rows.find(
            (candidate) =>
                list.constants.every(({ valueListProperty, constant }) =>
                    sameValue(candidate[valueListProperty], constant)
                ) &&
                list.members.every(
                    (member) =>
                        empty.includes(member) ||
                        sameValue(row[member.localProperty.name], memberValue(member, candidate))
                )
        );
        if (!match) {
            return;
        }
        for (const member of empty) {
            const value = memberValue(member, match);
            if (value !== undefined && !isEmpty(value) && fits(list.entity, member.localProperty, value)) {
                replacements.set(index, { ...replacements.get(index), [member.localProperty.name]: value });
                filled += 1;
            }
        }
    });
    return { rows: withReplacements(rows, replacements), filled };
}

/**
 * The value lists of the service whose value-help rows determine owner fields.
 *
 * @param graph service schema
 * @param existingData the caller's existing rows
 * @returns the value lists
 */
function ownedValueLists(
    graph: SchemaGraph,
    existingData: Readonly<Record<string, ExistingMockData>>
): ReadonlyArray<OwnedValueList> {
    const lists: Omit<OwnedValueList, 'shared'>[] = [];
    for (const entity of graph.entities) {
        const properties = new Map(entity.properties.map((property) => [property.name, property]));
        for (const owner of entity.properties) {
            const collection = owner.links?.valueListCollection;
            const parameters = owner.links?.valueListParameters ?? [];
            if (!collection || parameters.length === 0) {
                continue;
            }
            const { targetEntity } = resolveValueListContext(graph, collection, {}, existingData);
            const members = valueListTupleMembers(owner, parameters, properties, targetEntity);
            const constants = parameters.flatMap(({ valueListProperty, constant }) =>
                valueListProperty !== undefined && constant !== undefined ? [{ valueListProperty, constant }] : []
            );
            if (members.length > 0) {
                lists.push({ entity, collection, members, constants });
            }
        }
    }
    const listsPerMember = new Map<string, number>();
    for (const { entity, members } of lists) {
        for (const name of new Set(members.map(({ localProperty }) => localProperty.name))) {
            const key = `${entity.entitySetName}.${name}`;
            listsPerMember.set(key, (listsPerMember.get(key) ?? 0) + 1);
        }
    }
    return lists.map((list) => ({
        ...list,
        shared: new Set(
            list.members
                .map(({ localProperty }) => localProperty.name)
                .filter((name) => (listsPerMember.get(`${list.entity.entitySetName}.${name}`) ?? 0) > 1)
        )
    }));
}

/**
 * The properties per entity set the first pass of the fallback leaves alone: keys, declared enumerations and
 * relationship ends; owner fields a value list determines (the second pass copies them); and value-help
 * columns an owner field reads but cannot follow, because that field is fixed or several value lists
 * determine it. Supplied rows are skipped row by row.
 *
 * @param graph service schema
 * @param lists the value lists of the service
 * @param existingData the caller's existing rows
 * @returns the held property names by entity set
 */
function heldPropertyNames(
    graph: SchemaGraph,
    lists: ReadonlyArray<OwnedValueList>,
    existingData: Readonly<Record<string, ExistingMockData>>
): Map<string, Set<string>> {
    const held = new Map(graph.entities.map((entity) => [entity.entitySetName, protectedPropertyNames(graph, entity)]));
    const add = (entitySetName: string, name: string): void => {
        const names = held.get(entitySetName) ?? new Set<string>();
        names.add(name);
        held.set(entitySetName, names);
    };
    for (const { entity, collection, members, shared } of lists) {
        // Every field of a supplied owner is fixed, so a value-help column it reads must stay as it is.
        const ownerProtected = tupleProtectedProperties(graph, entity, existingData);
        for (const member of members) {
            if (shared.has(member.localProperty.name)) {
                add(entity.entitySetName, member.localProperty.name);
                add(collection, member.valueListProperty);
            } else if (ownerProtected.has(member.localProperty.name)) {
                add(collection, member.valueListProperty);
            } else {
                add(entity.entitySetName, member.localProperty.name);
            }
        }
    }
    return held;
}

/**
 * Whether a cell holds no value.
 *
 * @param value the cell value
 * @returns true for null, undefined and the empty string
 */
function isEmpty(value: JsonValue | undefined): boolean {
    return value === null || value === undefined || value === '';
}

/**
 * The rows with the replaced cells, each changed row a new frozen object.
 *
 * @param rows the rows
 * @param replacements replaced cells by row index
 * @returns the same array when nothing changed
 */
function withReplacements(
    rows: ReadonlyArray<MockDataRow>,
    replacements: ReadonlyMap<number, Record<string, JsonValue>>
): ReadonlyArray<MockDataRow> {
    if (replacements.size === 0) {
        return rows;
    }
    return rows.map((row, index) => {
        const replacement = replacements.get(index);
        return replacement ? Object.freeze({ ...row, ...replacement }) : row;
    });
}
