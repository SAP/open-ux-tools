import { FileFormat } from './types';
import type { ParseResult } from './types';
import { parseProperties } from './properties/parser';
import { parseCsv } from './csv/parser';

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
