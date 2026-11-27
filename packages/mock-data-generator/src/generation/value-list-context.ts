import type { ExistingMockData, JsonValue, MockDataRow } from '../types.js';
import type { SchemaEntity, SchemaGraph, SchemaProperty, SchemaValueListParameter } from '../schema/graph.js';
import { propertyValueIsValid } from './constraints.js';
import { hasAuthoritativeRows } from './rows.js';
import { inFacetForm } from '../spec/facets.js';

type ValueListContextSource = 'authored' | 'generated' | 'unavailable';

interface ValueListContext {
    source: ValueListContextSource;
    rows: ReadonlyArray<MockDataRow>;
    targetEntity?: SchemaEntity;
}

interface ValueListDisplayLink {
    localProperty: SchemaProperty;
    valueListProperty: SchemaProperty;
    targetTextProperty: SchemaProperty;
}

/**
 * Resolve value-help rows while preserving authored-source precedence.
 *
 * @param graph
 * @param collection
 * @param resources
 * @param existingData
 */
export function resolveValueListContext(
    graph: SchemaGraph,
    collection: string,
    resources: Readonly<Record<string, ReadonlyArray<MockDataRow>>>,
    existingData: Readonly<Record<string, ExistingMockData>>
): ValueListContext {
    const targetEntity = graph.entities.find(({ entitySetName }) => entitySetName === collection);
    const initial = existingData[collection]?.initialRows;
    if (hasAuthoritativeRows(initial)) {
        return { source: 'authored', rows: initial.rows, ...(targetEntity ? { targetEntity } : {}) };
    }
    if (initial?.present) {
        return { source: 'unavailable', rows: [], ...(targetEntity ? { targetEntity } : {}) };
    }
    const generatedRows = resources[collection];
    if (generatedRows !== undefined) {
        return { source: 'generated', rows: generatedRows, ...(targetEntity ? { targetEntity } : {}) };
    }
    return { source: 'unavailable', rows: [], ...(targetEntity ? { targetEntity } : {}) };
}

/**
 * The values in the supplied rows of the field's value helps, the domain the field chooses from. Supplied rows of the
 * field's own entity set are not evidence for new rows, since they may be placeholders.
 *
 * @param graph
 * @param entity
 * @param property
 * @param existingData
 */
export function authoredDomainValues(
    graph: SchemaGraph,
    entity: SchemaEntity,
    property: SchemaProperty,
    existingData: Readonly<Record<string, ExistingMockData>>
): ReadonlyArray<MockDataRow[string]> {
    const values: MockDataRow[string][] = [];
    const add = (value: MockDataRow[string] | undefined): void => {
        if (value !== undefined && propertyValueIsValid(property, value)) {
            values.push(value);
        }
    };
    for (const owner of entity.properties) {
        const collection = owner.links?.valueListCollection;
        if (!collection) {
            continue;
        }
        const context = resolveValueListContext(graph, collection, {}, existingData);
        if (context.source !== 'authored') {
            continue;
        }
        for (const mapping of owner.links?.valueListMappings ?? []) {
            if (mapping.localProperty === property.name) {
                context.rows.forEach((row) => add(row[mapping.valueListProperty]));
            }
        }
        if (owner.links?.text === property.name) {
            const ownerProperties = new Map(entity.properties.map((candidate) => [candidate.name, candidate]));
            for (const link of valueListDisplayLinks(
                owner,
                effectiveValueListParameters(owner),
                ownerProperties,
                context.targetEntity
            )) {
                context.rows.forEach((row) => add(row[link.targetTextProperty.name]));
            }
        }
    }
    return Object.freeze(values);
}

/**
 * Value-list parameters of an owner property, the single source of its value-list tuple (both metadata parsers
 * derive `valueListMappings` from them).
 *
 * @param owner property carrying the value-list annotation
 * @returns the parameters that govern the owner's value-list tuple
 */
export function effectiveValueListParameters(owner: SchemaProperty): ReadonlyArray<SchemaValueListParameter> {
    return owner.links?.valueListParameters ?? [];
}

/**
 * Cut a value-help text in code points to the local text property's narrower length; other values are unchanged.
 *
 * @param localProperty local text property receiving the display value
 * @param value value-help text value
 * @returns the value as the local property can represent it
 */
export function fitDisplayText(localProperty: SchemaProperty, value: JsonValue | undefined): JsonValue | undefined {
    if (
        typeof value !== 'string' ||
        localProperty.primitiveType !== 'string' ||
        localProperty.maxLength === undefined
    ) {
        return value;
    }
    const characters = Array.from(value);
    return characters.length > localProperty.maxLength ? characters.slice(0, localProperty.maxLength).join('') : value;
}

/**
 * Find the display link given by a mapped value-help key's explicit text link. With several such keys and no
 * single owner mapping the source is ambiguous, and no link is returned.
 *
 * @param owner property carrying the value-list annotation
 * @param parameters the owner's value-list parameters
 * @param ownerProperties owner entity properties by name
 * @param targetEntity value-help entity
 * @returns the display links for the owner's text property (at most one)
 */
export function valueListDisplayLinks(
    owner: SchemaProperty,
    parameters: ReadonlyArray<SchemaValueListParameter>,
    ownerProperties: ReadonlyMap<string, SchemaProperty>,
    targetEntity: SchemaEntity | undefined
): ReadonlyArray<ValueListDisplayLink> {
    const localTextName = owner.links?.text;
    if (!localTextName || !targetEntity) {
        return [];
    }
    const localProperty = ownerProperties.get(localTextName);
    if (!localProperty) {
        return [];
    }
    const candidates = targetEntity.properties.flatMap((targetProperty) => {
        const targetTextName = targetProperty.links?.text;
        if (!targetProperty.isKey || !targetTextName) {
            return [];
        }
        const targetTextProperty = targetEntity.properties.find(({ name }) => name === targetTextName);
        if (!targetTextProperty) {
            return [];
        }
        const mapped = parameters.some(({ valueListProperty }) => valueListProperty === targetProperty.name);
        return mapped ? [{ localProperty, valueListProperty: targetProperty, targetTextProperty }] : [];
    });
    const ownerMapped = candidates.filter(({ valueListProperty }) =>
        parameters.some(
            (parameter) =>
                parameter.direction !== 'DisplayOnly' &&
                parameter.localProperty === owner.name &&
                parameter.valueListProperty === valueListProperty.name
        )
    );
    if (ownerMapped.length > 0) {
        return ownerMapped.length === 1 ? ownerMapped : [];
    }
    return candidates.length === 1 ? candidates : [];
}

/**
 * One owner field that must agree with the selected value-help tuple: a non-DisplayOnly parameter
 * with a local property, or the owner's display text.
 */
export interface ValueListTupleMember {
    direction: 'In' | 'InOut' | 'Out';
    localProperty: SchemaProperty;
    valueListProperty: string;
    /** The local receives a value-help text and holds its leading characters (see fitDisplayText). */
    fitted: boolean;
    /** The member is the owner's display text rather than a declared parameter. */
    display: boolean;
}

/**
 * The owner fields a value-list tuple determines. An Out parameter copying a key's text may be cut to the local facet;
 * InOut and In parameters stay exact.
 *
 * @param owner property carrying the value-list annotation
 * @param parameters the owner's effective value-list parameters
 * @param ownerProperties owner entity properties by name
 * @param targetEntity value-help entity
 * @returns tuple members; parameters whose local property is not declared are omitted
 */
export function valueListTupleMembers(
    owner: SchemaProperty,
    parameters: ReadonlyArray<SchemaValueListParameter>,
    ownerProperties: ReadonlyMap<string, SchemaProperty>,
    targetEntity: SchemaEntity | undefined
): ReadonlyArray<ValueListTupleMember> {
    const textColumns = new Set(
        (targetEntity?.properties ?? []).flatMap(({ isKey, links }) => (isKey && links?.text ? [links.text] : []))
    );
    const members: ValueListTupleMember[] = [];
    for (const { direction, localProperty, valueListProperty } of parameters) {
        const local = localProperty ? ownerProperties.get(localProperty) : undefined;
        if (direction === 'DisplayOnly' || !local || !valueListProperty) {
            continue;
        }
        members.push({
            direction,
            localProperty: local,
            valueListProperty,
            fitted: direction === 'Out' && textColumns.has(valueListProperty),
            display: false
        });
    }
    for (const link of valueListDisplayLinks(owner, parameters, ownerProperties, targetEntity)) {
        members.push({
            direction: 'Out',
            localProperty: link.localProperty,
            valueListProperty: link.targetTextProperty.name,
            fitted: true,
            display: true
        });
    }
    return members;
}

/**
 * The value an owner field takes when it adopts a value-help tuple, in the form the owner field's facets give.
 *
 * @param member tuple member
 * @param candidate value-help row
 * @returns the owner-side value, or undefined when the row does not expose the column
 */
export function memberValue(member: ValueListTupleMember, candidate: MockDataRow): JsonValue | undefined {
    const value = candidate[member.valueListProperty];
    const fitted = member.fitted ? fitDisplayText(member.localProperty, value) : value;
    return typeof fitted === 'string' ? (inFacetForm(member.localProperty, fitted) ?? fitted) : fitted;
}
