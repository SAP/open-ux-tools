import { FileFormat } from './types.js';
import type { ParseResult } from './types.js';
import { parseProperties } from './properties/parser/index.js';
import { parseCsv } from './csv/parser/index.js';

/**
 * Parse text.
 *
 * @param text text
 * @param format extension format
 * @returns parse result
 */
export function parse(text: string, format: FileFormat): ParseResult {
    if (format === FileFormat.properties) {
        return parseProperties(text);
    }
    return parseCsv(text);
}
