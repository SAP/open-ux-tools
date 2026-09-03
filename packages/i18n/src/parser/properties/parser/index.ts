import { tokenize } from '../lexer/index.js';
import type { PropertiesParseResult } from '../types.js';
import { getPropertyList } from './properties-parser.js';

/**
 * Parse properties text.
 *
 * @param text text
 * @returns parse result
 */
export function parseProperties(text: string): PropertiesParseResult {
    const tokens = tokenize(text);
    const ast = getPropertyList(tokens, text);
    return { ast, tokens };
}
