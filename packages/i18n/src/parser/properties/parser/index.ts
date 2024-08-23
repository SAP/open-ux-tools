import { tokenize } from '../lexer';
import type { PropertiesParseResult } from '../types';
import { getPropertyList } from './properties-parser';

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
