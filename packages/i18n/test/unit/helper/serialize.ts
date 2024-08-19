import type { Position, Range } from '@sap-ux/text-document-utils';

const rangePropertyPattern = /ranges?/i;
const compactPosition = (position: Position) => `(${position.line},${position.character})`;
const compactRange = (range: Range) => `[${compactPosition(range.start)}..${compactPosition(range.end)}]`;

const compactAst = (key: string, value: any) => {
    if (value === 0 && 1 / value < 0) {
        // when serializing 0 the sign is removed, we need to avoid this lossy transformation
        return 'NEGATIVE_ZERO';
    }
    if (rangePropertyPattern.test(key) && value) {
        if (Array.isArray(value)) {
            return value.map(compactRange);
        }
        return compactRange(value);
    }
    if (value === undefined) {
        return 'undefined';
    }
    return value;
};

export const serialize = <T = unknown>(value: T): string => {
    const text = JSON.stringify(value, compactAst, 2) + '\n';
    return text;
};
