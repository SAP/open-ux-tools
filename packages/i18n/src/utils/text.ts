import type { SapTextType } from '../types';
import { SapLongTextType, SapShortTextType } from '../types';

/**
 * Get the calculated maximum text length for an i18n property value.
 *
 * @param value - Value of the i18n property
 * @returns max length for a given value
 * @description The algorithm considers the current UI5 specification.
 */
export function getI18nMaxLength(value: string): number {
    const iLength = value.length;
    if (iLength < 8) {
        return iLength * 5;
    }
    if (iLength <= 30) {
        return iLength * 3;
    }
    return iLength * 1.5;
}

/**
 * Get a suitable textType for an i18n property.
 *
 * @param maxLength - Maximum text length of the i18n property value
 * @returns returns text type
 * @description The textType is derived from the maximum text length maxLength of the property value.
 */
export function getI18nTextType(maxLength: number): SapTextType {
    if (maxLength <= 120) {
        return SapShortTextType.Label;
    }
    return SapLongTextType.MessageText;
}

/**
 * Discover line ending.
 *
 * @param text text
 * @returns text
 */
export function discoverLineEnding(text: string): string {
    for (let i = 0; i < text.length; i++) {
        const character = text[i];
        if (character === '\r') {
            if (i + 1 < text.length && text[i + 1] === '\n') {
                return '\r\n';
            }
            return '\r';
        } else if (character === '\n') {
            return '\n';
        }
    }

    return '\n';
}
const INDENT_PATTERN = /(?:\r|\n|\r?\n)([ \t]+)/;

/**
 * Discover indent.
 *
 * @param text text
 * @returns indented text
 */
export function discoverIndent(text: string): string {
    const match = INDENT_PATTERN.exec(text);
    if (match) {
        return match[1];
    }

    return '    ';
}
const LINE_ENDING_PATTERN = /\r|\n|\r?\n/;

/**
 * Apply indent.
 *
 * @param text text
 * @param indent indent
 * @param eol end of line
 * @param indentFirstLine indent first line
 * @returns indented text
 */
export function applyIndent(text: string, indent: string, eol: string, indentFirstLine = true): string {
    const lines = text.split(LINE_ENDING_PATTERN);
    let out = '';
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!indentFirstLine && i === 0) {
            out += line;
        } else {
            out += indent + line;
        }
        if (i + 1 !== lines.length) {
            out += eol;
        }
    }
    return out;
}

/**
 * Convert to camel case. It gets text like 'product details info' and convert it to 'productDetailsInfo'.
 *
 * @param text text
 * @param maxWord maximal word
 * @returns camel case text
 */
export function convertToCamelCase(text = '', maxWord = 4): string {
    let output = '';
    const parts = text
        .replace(/[^a-zA-Z0-9 ]/g, '')
        .trim()
        .split(' ');
    const len = parts.length >= maxWord ? maxWord : parts.length;
    for (let i = 0; len > i; i++) {
        const part = parts[i];
        if (i === 0) {
            output += part.toLowerCase();
        } else {
            const initial = part.charAt(0).toUpperCase();
            const rest = part.substring(1).toLowerCase();
            output += `${initial}${rest}`;
        }
    }

    return output;
}
/**
 * Convert to pascal case. It gets text like 'product details info' and convert it to 'ProductDetailsInfo'.
 *
 * @param text text
 * @param maxWord maximal word
 * @returns pascal case text
 */
export function convertToPascalCase(text: string, maxWord = 4): string {
    let output = '';
    const parts = text
        .replace(/[^a-zA-Z0-9 ]/g, '')
        .trim()
        .split(' ');
    const len = parts.length >= maxWord ? maxWord : parts.length;
    for (let i = 0; len > i; i++) {
        const part = parts[i];
        const initial = part.charAt(0).toUpperCase();
        const rest = part.substring(1).toLowerCase();
        output += `${initial}${rest}`;
    }

    return output;
}
