import { InputType, isExpression } from './types';

export type CacheValue = string | boolean | number;

const propertyValueCache: Record<string, Record<string, Record<string, CacheValue>>> = {};

export const setCachedValue = (
    controlId: string,
    propertyName: string,
    defaultInputType: string,
    value: CacheValue
): void => {
    if (!propertyValueCache[controlId]) {
        propertyValueCache[controlId] = {};
    }
    const propertyMap = propertyValueCache[controlId];
    if (propertyMap) {
        if (!propertyMap[propertyName]) {
            propertyMap[propertyName] = {};
        }
        const inputTypeMap = propertyMap[propertyName];
        if (inputTypeMap) {
            const inputType = isExpression(value) ? InputType.expression : defaultInputType;
            inputTypeMap[inputType] = value;
        }
    }
};

export const getCachedValue = (controlId: string, propertyId: string, inputType: string): CacheValue | null => {
    const propertyMap = propertyValueCache[controlId];
    if (!propertyMap) {
        return null;
    }
    const inputTypeMap = propertyMap[propertyId];
    if (!inputTypeMap) {
        return null;
    }
    return inputTypeMap[inputType] || null;
};
