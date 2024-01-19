import { FileFormat, ParseResult } from './types';
import { parseProperties } from './properties/parser';
import { parseCsv } from './csv/parser';

export const parse = (text: string, format: FileFormat): ParseResult => {
    if (format === FileFormat.properties) {
        return parseProperties(text);
    }
    return parseCsv(text);
};
