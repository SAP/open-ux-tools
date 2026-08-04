import type { CsvParseResult } from './csv/types.js';
import type { PropertiesParseResult } from './properties/types.js';

export enum FileFormat {
    properties = 'properties',
    csv = 'csv',
    json = 'json'
}

export type ParseResult = PropertiesParseResult | CsvParseResult;
