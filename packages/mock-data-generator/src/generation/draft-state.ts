import type { SchemaEntity, SchemaProperty } from '../schema/graph.js';
import type { JsonValue } from '../types.js';
import {
    ACTIVE_ROW_DRAFT_FLAGS,
    DRAFT_ADMINISTRATIVE_DATA_KEY_NAME,
    DRAFT_STATE_PROPERTY_NAMES,
    DRAFT_UUID_PROPERTY_NAME,
    INITIAL_DRAFT_UUID
} from '../spec/draft.js';
import { propertyValueIsValid } from './constraints.js';

/**
 * Whether an entity is draft-enabled: it carries the draft model's `IsActiveEntity` flag.
 *
 * @param entity the entity
 * @returns true for a draft-enabled entity
 */
export function isDraftEnabled(entity: SchemaEntity): boolean {
    return entity.properties.some(
        ({ name, primitiveType }) =>
            primitiveType === 'bool' && name.toLowerCase() === DRAFT_STATE_PROPERTY_NAMES.isActiveEntity
    );
}

/**
 * The value a draft administration property holds in an active row, since mock data holds active rows only. Undefined
 * for any other property, or when the property cannot hold that value.
 *
 * @param entity the property's entity
 * @param property the property
 * @returns the active row's value, or undefined
 */
export function activeDraftValue(entity: SchemaEntity, property: SchemaProperty): JsonValue | undefined {
    if (!isDraftEnabled(entity)) {
        return undefined;
    }
    const name = property.name.toLowerCase();
    const value: JsonValue | undefined =
        ACTIVE_ROW_DRAFT_FLAGS[name] ??
        (name === DRAFT_UUID_PROPERTY_NAME && property.isKey ? INITIAL_DRAFT_UUID : undefined) ??
        (name === DRAFT_ADMINISTRATIVE_DATA_KEY_NAME && property.nullable ? null : undefined);
    return value !== undefined && (value === null || propertyValueIsValid(property, value)) ? value : undefined;
}
