import { parseCsv } from '../../parser/csv/parser';
import type { CsvField } from '../../parser/csv/types';
import type { I18nBundle, I18nEntry, TextNode } from '../../types';

/**
 * Convert csv field to text node.
 *
 * @param field csv field
 * @returns text node or undefined
 */
function toTextNode(field: CsvField | undefined): TextNode | undefined {
    if (!field) {
        return undefined;
    }
    return {
        value: field.value,
        range: field.range
    };
}

/**
 * Convert CSV content to i18n bundles.
 *
 * @param text csv text
 * @param filePath file path of csv text
 * @returns i18n bundles
 */
export function csvToI18nBundle(text: string, filePath = ''): I18nBundle {
    const bundle: I18nBundle = {};
    const { ast } = parseCsv(text);
    for (let columnIndex = 1; columnIndex < ast.header.fields.length; columnIndex++) {
        const locale = ast.header.fields[columnIndex];
        const entries: I18nEntry[] = [];
        for (const row of ast.rows) {
            if (row) {
                const key = toTextNode(row.fields[0]);
                const value = toTextNode(row.fields[columnIndex]);
                if (key && value) {
                    entries.push({
                        filePath,
                        key,
                        value
                    });
                }
            }
        }
        bundle[locale.value] = entries;
    }
    return bundle;
}
