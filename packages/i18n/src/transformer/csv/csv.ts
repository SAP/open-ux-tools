import { parseCsv } from '../../parser/csv/parser';
import type { CsvField } from '../../parser/csv/types';
import type { I18nBundle, I18nEntry, TextNode } from '../../types';

const toTextNode = (field: CsvField | undefined): TextNode | undefined => {
    if (!field) {
        return;
    }
    return {
        value: field.value,
        range: field.range
    };
};


export const csvToI18nBundle = (text: string, filePath = ''): I18nBundle => {
    const bundle: I18nBundle = {};
    const { ast } = parseCsv(text);
    for (let columnIndex = 1; columnIndex < ast.header.fields.length; columnIndex++) {
        const locale = ast.header.fields[columnIndex];
        const entries: I18nEntry[] = [];
        for (let i = 0; i < ast.rows.length; i++) {
            const row = ast.rows[i];
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
};
