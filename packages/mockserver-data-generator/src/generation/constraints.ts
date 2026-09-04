import type { JsonValue } from '../types.js';
import type { SchemaProperty } from '../schema/graph.js';

function decimalPlaces(value: number): number {
    const text = value.toString().toLowerCase();
    if (text.includes('e')) {
        const [coefficient, exponentText] = text.split('e');
        const exponent = Number(exponentText);
        const fraction = coefficient?.split('.')[1]?.length ?? 0;
        return Math.max(0, fraction - exponent);
    }
    return text.split('.')[1]?.length ?? 0;
}

function calendarDateIsValid(value: string): boolean {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) {
        return false;
    }
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const parsed = new Date(0);
    parsed.setUTCHours(0, 0, 0, 0);
    parsed.setUTCFullYear(year, month - 1, day);
    return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
}

function dateTimeIsValid(value: string, requireOffset: boolean): boolean {
    const match =
        /^(\d{4}-\d{2}-\d{2})T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?(Z|[+-](?:(?:0\d|1[0-3]):[0-5]\d|14:00))?$/.exec(
            value
        );
    return (
        match !== null &&
        (!requireOffset || match[2] !== undefined) &&
        calendarDateIsValid(match[1]) &&
        !Number.isNaN(Date.parse(value))
    );
}

/**
 * Shared structural constraint check used for deterministic and learned candidates.
 *
 * @param property
 * @param value
 */
export function propertyValueIsValid(property: SchemaProperty, value: unknown): value is JsonValue {
    if (value === null) {
        return property.nullable;
    }
    if (property.enumValues && !property.enumValues.includes(value as string | number | boolean)) {
        return false;
    }
    switch (property.primitiveType) {
        case 'int':
            return typeof value === 'number' && Number.isSafeInteger(value);
        case 'decimal': {
            if (typeof value !== 'number' || !Number.isFinite(value)) {
                return false;
            }
            if (property.scale !== undefined && decimalPlaces(value) > property.scale) {
                return false;
            }
            if (property.precision !== undefined) {
                const scale = property.scale ?? 0;
                const scaled = Math.round(Math.abs(value) * 10 ** scale);
                if (scaled.toString().length > property.precision) {
                    return false;
                }
            }
            return true;
        }
        case 'bool':
            return typeof value === 'boolean';
        case 'string':
        case 'binary':
            return (
                typeof value === 'string' &&
                (property.maxLength === undefined || Array.from(value).length <= property.maxLength)
            );
        case 'guid':
            return typeof value === 'string' && /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(value);
        case 'date':
            return typeof value === 'string' && calendarDateIsValid(value);
        case 'datetime':
            return typeof value === 'string' && dateTimeIsValid(value, false);
        case 'datetimeoffset':
            return typeof value === 'string' && dateTimeIsValid(value, true);
        case 'time':
            return typeof value === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d$/.test(value);
    }
}
