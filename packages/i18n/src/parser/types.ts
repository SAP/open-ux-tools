import type { CsvParseResult } from './csv/types';
import type { PropertiesParseResult } from './properties/types';

export enum FileFormat {
    properties = 'properties',
    csv = 'csv',
    json = 'json'
}

export type ParseResult = PropertiesParseResult | CsvParseResult;
