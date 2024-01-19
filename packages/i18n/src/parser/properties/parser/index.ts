import { tokenize } from '../lexer';
import type { PropertiesParseResult } from '../types';
import { getPropertyList } from './properties-parser';

export const parseProperties = (text: string): PropertiesParseResult => {
    const tokens = tokenize(text);
    const ast = getPropertyList(tokens, text);
    return { ast, tokens };
};
