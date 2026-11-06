import type { SchemaEntity, SchemaGraph, SchemaProperty } from '../schema/graph.js';
import type { ExistingMockData, JsonValue, MockDataRow, SyntheticCoherenceRule } from '../types.js';
import { generatedRowFlags } from './authored.js';
import { codeTextPairs } from './code-texts.js';
import { coherencePropertyNames } from './coherence.js';
import { propertyValueIsValid } from './constraints.js';
import { protectedPropertyNames, relationshipEndNames, sameValue } from './rows.js';
import { memberValue, resolveValueListContext, valueListTupleMembers } from './value-list-context.js';
import type { ValueListTupleMember } from './value-list-context.js';
import { inFacetForm, stringFacets } from '../spec/facets.js';
import { standardFallbackValue } from '../spec/standard-mockserver.js';
import { semanticPropertyKey } from '../semantics/classifier.js';
import { undoChangesBreakingFinalChecks } from './final-checks.js';
import { semanticValueIsValid } from './semantic-plan.js';
import { codeShaped } from './deterministic.js';
import { sha256Uint32 } from '../hash.js';
import { semanticRules } from '../semantics/rule-store.js';
import { semanticRoleDefinition } from '../semantics/role-registry.js';

/** The rows after the fallback and how many cells it filled. */
export interface StandardFallbackResult {
    resources: Readonly<Record<string, ReadonlyArray<MockDataRow>>>;
    filled: number;
    /** Filled cells by `EntitySet.Property`. */
    filledByField: ReadonlyMap<string, number>;
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
 * Fill the generated string cells no tier gave a value the way the standard mock server does
 * ({@link standardFallbackValue}), as the last step. Code texts, value-list tuples, supplied rows, keys, enumerations
 * and relationship ends stay intact, and a change that breaks a final check is undone
 * ({@link undoChangesBreakingFinalChecks}).
 *
 * @param graph service schema
 * @param resources the final rows
 * @param existingData the caller's existing rows
 * @param roles planned semantic roles by field
 * @param coherence the coherence rules by entity set; the fields they govern keep the values the rules chose
 * @returns the rows and the number of filled cells
 */
export function applyStandardFallback(
    graph: SchemaGraph,
    resources: Readonly<Record<string, ReadonlyArray<MockDataRow>>>,
    existingData: Readonly<Record<string, ExistingMockData>>,
    roles: Readonly<Record<string, string>>,
    coherence: Readonly<Record<string, readonly SyntheticCoherenceRule[]>> = {}
): StandardFallbackResult {
    const lists = ownedValueLists(graph, existingData);
    const held = heldPropertyNames(graph, lists);
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
        const governed = coherencePropertyNames(entity, coherence[entity.entitySetName] ?? ['temporal']);
        // An empty indicator says "no", so it holds a value already, as does a field a coherence rule decides.
        const fillable = entity.properties.filter(
            (property) =>
                property.primitiveType === 'string' &&
                !excluded.has(property.name) &&
                !governed.has(property.name) &&
                !holdsTruthValue(roles[semanticPropertyKey(entity.entitySetName, property.name)])
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
                const value = fallbackValue(entity, property, ordinal);
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
    return {
        resources: checked.resources,
        filled: filled - checked.reverted,
        filledByField: filledCells(resources, checked.resources)
    };
}

/**
 * The cells that were empty before the fallback and hold a value after it, counted by field.
 *
 * @param before the rows before the fallback
 * @param after the rows after it
 * @returns the filled cells by `EntitySet.Property`
 */
function filledCells(
    before: Readonly<Record<string, ReadonlyArray<MockDataRow>>>,
    after: Readonly<Record<string, ReadonlyArray<MockDataRow>>>
): ReadonlyMap<string, number> {
    const counts = new Map<string, number>();
    for (const [entitySetName, rows] of Object.entries(after)) {
        const previous = before[entitySetName];
        if (previous === undefined || previous === rows) {
            continue;
        }
        rows.forEach((row, index) => {
            for (const [name, value] of Object.entries(row)) {
                if (!isEmpty(value) && isEmpty(previous[index]?.[name])) {
                    const key = semanticPropertyKey(entitySetName, name);
                    counts.set(key, (counts.get(key) ?? 0) + 1);
                }
            }
        });
    }
    return counts;
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
    // A relationship end keeps the value relationship assignment chose, an empty reference included.
    const relationshipEnds = relationshipEndNames(graph, list.entity);
    const replacements = new Map<number, Record<string, JsonValue>>();
    let filled = 0;
    rows.forEach((row, index) => {
        const empty = list.members.filter(
            ({ localProperty }) =>
                localProperty.primitiveType === 'string' &&
                !list.shared.has(localProperty.name) &&
                !relationshipEnds.has(localProperty.name) &&
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
 * The properties per entity set the first pass of the fallback leaves alone: keys, enumerations, relationship ends,
 * value-list owner fields (the second pass copies them) and value-help columns an owner field cannot follow.
 *
 * @param graph service schema
 * @param lists the value lists of the service
 * @returns the held property names by entity set
 */
function heldPropertyNames(graph: SchemaGraph, lists: ReadonlyArray<OwnedValueList>): Map<string, Set<string>> {
    const held = new Map(graph.entities.map((entity) => [entity.entitySetName, protectedPropertyNames(graph, entity)]));
    const add = (entitySetName: string, name: string): void => {
        const names = held.get(entitySetName) ?? new Set<string>();
        names.add(name);
        held.set(entitySetName, names);
    };
    for (const { entity, collection, members, shared } of lists) {
        // A fixed owner field keeps its value, so a value-help column it reads must stay as it is.
        const ownerProtected = protectedPropertyNames(graph, entity);
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
 * The fallback value of one cell: the standard mock server's value when the whole field name fits the field,
 * else a code of the field's initials, which a short field holds better than a cut-off name (`Addr_0`).
 *
 * @param entity the field's entity
 * @param property the string field
 * @param ordinal the zero-based ordinal of the value
 * @returns the value, or undefined when not even a code fits
 */
function fallbackValue(entity: SchemaEntity, property: SchemaProperty, ordinal: number): string | undefined {
    const { digits } = stringFacets(property);
    const value = standardFallbackValue(property, ordinal);
    const standard = value?.startsWith(`${property.name}_`) && !digits ? inFacetForm(property, value) : undefined;
    if (standard !== undefined) {
        return standard;
    }
    const hash = sha256Uint32(`${entity.entitySetName}:${property.name}:${ordinal}`);
    const code = codeShaped(
        property.name,
        (hash % semanticRules().typedFloor.codeOrdinals) + 1,
        property.maxLength,
        digits
    );
    return code === '' ? undefined : code;
}

/**
 * Whether a planned role makes a string field a truth value, whose empty value means false.
 *
 * @param role the planned role, if any
 * @returns true for a role of the boolean family
 */
function holdsTruthValue(role: string | undefined): boolean {
    return role !== undefined && semanticRoleDefinition(role)?.family === 'boolean';
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
