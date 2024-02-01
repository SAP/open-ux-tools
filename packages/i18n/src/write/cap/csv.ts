import { promises } from 'fs';
import type { CdsEnvironment, NewI18nEntry } from '../../types';
import { csvPath, discoverLineEnding, getI18nConfiguration, doesExist } from '../../utils';

import type { TextEdit } from 'vscode-languageserver-textdocument';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Range, Position } from '../../parser/utils';
import { parseCsv } from '../../parser/csv/parser';

export const addCsvTexts = (text: string, fallbackLocale: string, newEntries: NewI18nEntry[]): string => {
    const { ast } = parseCsv(text);
    const eol = discoverLineEnding(text);

    const headerFields = ast.header.fields;
    if (headerFields.length === 0) {
        let newText = `key;${fallbackLocale}${eol}`;
        for (const entry of newEntries) {
            newText += `${entry.key};${entry.value}${eol}`;
        }
        return text + newText;
    }

    const fallbackFieldIndex = headerFields.findIndex((field) => field.value === fallbackLocale);
    if (fallbackFieldIndex !== -1) {
        let newText = '';
        for (const entry of newEntries) {
            newText += `${entry.key};`;
            for (let column = 1; column < headerFields.length; column++) {
                const columnHeader = headerFields[column];
                if (columnHeader.value === fallbackLocale) {
                    newText += `${entry.value}`;
                }
                if (column + 1 !== headerFields.length) {
                    newText += ';';
                }
            }
            newText += eol;
        }
        if (text.endsWith(eol)) {
            return text + newText;
        }
        return text + eol + newText;
    }

    const document = TextDocument.create('', '', 0, text);
    const edits: TextEdit[] = [];

    edits.push({
        newText: `;${fallbackLocale}`,
        range: Range.create(0, ast.header.range.end.character, 0, ast.header.range.end.character)
    });

    for (const row of ast.rows) {
        edits.push({
            newText: `;`,
            range: Range.create(row.range.end, row.range.end)
        });
    }
    let newText = `${eol}`;
    for (const entry of newEntries) {
        newText += `${entry.key};`;
        for (let column = 1; column < headerFields.length; column++) {
            newText += ';';
        }
        newText += `${entry.value}${eol}`;
    }
    const lastRow = ast.rows.slice(-1)[0];
    const position = lastRow ? lastRow.range.end : Position.create(1, 0);
    edits.push({
        newText,
        range: Range.create(position, position)
    });
    return TextDocument.applyEdits(document, edits);
};

export async function tryAddCsvTexts(
    env: CdsEnvironment,
    path: string,
    newI18nEntries: NewI18nEntry[]
): Promise<boolean> {
    const i18nFilePath = csvPath(path);
    if (!(await doesExist(i18nFilePath))) {
        return false;
    }
    const { defaultLanguage } = getI18nConfiguration(env);
    const content = await promises.readFile(i18nFilePath, { encoding: 'utf8' });
    const newContent = addCsvTexts(content, defaultLanguage, newI18nEntries);
    await promises.writeFile(i18nFilePath, newContent, { encoding: 'utf8' });
    return true;
}
