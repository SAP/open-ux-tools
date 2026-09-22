import type { ExistingMockData, JsonValue, MockDataRow } from '../types.js';
import type { SchemaEntity, SchemaGraph, SchemaProperty, SchemaValueListParameter } from '../schema/graph.js';
import { propertyValueIsValid } from './constraints.js';

export type ValueListContextSource = 'authored' | 'generated' | 'unavailable';

export interface ValueListContext {
    source: ValueListContextSource;
    rows: ReadonlyArray<MockDataRow>;
    targetEntity?: SchemaEntity;
}

export interface ValueListDisplayLink {
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
    if (initial?.present) {
        if (initial.source === 'json' || initial.enumerable) {
            return { source: 'authored', rows: initial.rows, ...(targetEntity ? { targetEntity } : {}) };
        }
        return { source: 'unavailable', rows: [], ...(targetEntity ? { targetEntity } : {}) };
    }
    const generatedRows = resources[collection];
    if (generatedRows !== undefined) {
        return { source: 'generated', rows: generatedRows, ...(targetEntity ? { targetEntity } : {}) };
    }
    return { source: 'unavailable', rows: [], ...(targetEntity ? { targetEntity } : {}) };
}

/**
 * Values explicitly present in authored rows or their linked value-help tuples.
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
    const ownRows = resolveValueListContext(graph, entity.entitySetName, {}, existingData);
    if (ownRows.source === 'authored') {
        ownRows.rows.forEach((row) => add(row[property.name]));
    }
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
 * Value-list parameters of an owner property, falling back to its local/value-list mappings
 * (treated as InOut) when the metadata declares mappings without typed parameters.
 *
 * @param owner property carrying the value-list annotation
 * @returns the parameters that govern the owner's value-list tuple
 */
export function effectiveValueListParameters(owner: SchemaProperty): ReadonlyArray<SchemaValueListParameter> {
    const parameters = owner.links?.valueListParameters ?? [];
    if (parameters.length > 0) {
        return parameters;
    }
    return (owner.links?.valueListMappings ?? []).map(({ localProperty, valueListProperty }) => ({
        direction: 'InOut' as const,
        localProperty,
        valueListProperty
    }));
}

/**
 * Project a value-help text into the local text property that displays it.
 *
 * A local text companion may declare a narrower facet than the value-help text it
 * mirrors (e.g. a 15-character `CurrencyT` beside a 40-character `I_Currency.Currency_Text`).
 * The representable display value is then the leading characters of the value-help text,
 * counted in code points exactly as `propertyValueIsValid` counts them. Values that already
 * fit, and non-string values, are returned unchanged, so equality stays exact wherever the
 * full text is representable.
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
 * Find display propagation supported by a value-help key's explicit text link.
 * DisplayOnly parameters without a local property are intentionally ignored.
 *
 * The owner's text describes the owner's own value, so it mirrors the text of the value-help key
 * that the owner property itself is mapped to. When the owner is not mapped to a text-bearing key,
 * a single mapped text-bearing key is still unambiguous. Several mapped text-bearing keys without an
 * owner mapping (for example a cost center keyed by cost center and controlling area) leave the
 * display source ambiguous, and no link is returned: pairing one local text with every key text
 * would demand that the local text equal several different values at once.
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
 * The owner fields that a value-list tuple determines, with how each value is carried into the owner.
 *
 * An Out parameter that copies a value-help key's text is a display copy, exactly like the display
 * text link, so it holds the leading characters of that text when the local facet is narrower.
 * InOut and In parameters are filters as well as copies and stay exact.
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
 * The value an owner field takes when it adopts a value-help tuple.
 *
 * @param member tuple member
 * @param candidate value-help row
 * @returns the owner-side value, or undefined when the row does not expose the column
 */
export function memberValue(member: ValueListTupleMember, candidate: MockDataRow): JsonValue | undefined {
    const value = candidate[member.valueListProperty];
    return member.fitted ? fitDisplayText(member.localProperty, value) : value;
}

/**
 * Owner fields whose values are fixed for tuple purposes: keys, declared enumerations, both ends of
 * every relationship mapping and, for an authoritative (authored, enumerable) owner, every field.
 * Projection never rewrites these fields, and validation treats them as authoritative.
 *
 * @param graph schema graph
 * @param entity owner entity
 * @param existingData authored data by resource
 * @returns names of protected properties
 */
export function tupleProtectedProperties(
    graph: SchemaGraph,
    entity: SchemaEntity,
    existingData: Readonly<Record<string, ExistingMockData>>
): ReadonlySet<string> {
    const initialRows = existingData[entity.entitySetName]?.initialRows;
    if (initialRows?.present === true && (initialRows.source === 'json' || initialRows.enumerable)) {
        return new Set(entity.properties.map(({ name }) => name));
    }
    const protectedProperties = new Set(
        entity.properties.filter(({ isKey, enumValues }) => isKey || enumValues !== undefined).map(({ name }) => name)
    );
    for (const relationship of graph.relationships) {
        if (relationship.fromEntitySet === entity.entitySetName) {
            relationship.mappings.forEach(({ sourceProperty }) => protectedProperties.add(sourceProperty));
        }
        if (relationship.toEntitySet === entity.entitySetName) {
            relationship.mappings.forEach(({ targetProperty }) => protectedProperties.add(targetProperty));
        }
    }
    return protectedProperties;
}
