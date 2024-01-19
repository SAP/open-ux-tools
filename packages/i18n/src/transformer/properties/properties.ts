import { parseProperties } from '../../parser/properties/parser';
import type { I18nEntry } from './../../types';
import { getAnnotation } from './annotation';

/**
 * Get i18n entry for i18n.properties file
 * @param content
 * @param filePath
 */
export const propertiesToI18nEntry = (content: string, filePath = ''): I18nEntry[] => {
    const i18nEntries: I18nEntry[] = [];
    const { ast } = parseProperties(content);
    for (let i = 0; ast.length > i; i++) {
        const line = ast[i];
        if (line.type !== 'key-element-line') {
            continue;
        }
        const commentLine = ast[i - 1];
        const entry: I18nEntry = {
            filePath,
            key: {
                value: line.key.value,
                range: line.key.range
            },
            value: {
                value: line.element.value,
                range: line.element.range
            },
            annotation: getAnnotation(commentLine)
        };
        i18nEntries.push(entry);
    }
    return i18nEntries;
};
