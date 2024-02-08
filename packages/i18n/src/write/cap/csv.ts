import { promises } from 'fs';
import type { CdsEnvironment, NewI18nEntry } from '../../types';
import { csvPath, discoverLineEnding, getI18nConfiguration, doesExist } from '../../utils';

import type { TextEdit } from 'vscode-languageserver-textdocument';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Range, Position } from '../../parser/utils';
import { parseCsv } from '../../parser/csv/parser';
import type { CsvField } from '../../parser/csv/types';

/**
 * Add CSV text for fallback.
 *
 * @param text csv text
 * @param eol end of line
 * @param newEntries new i18n entries
 * @param headerFields header fields of csv
 * @param fallbackLocale fallback local
 * @returns csv text
 */
function addFallbackCsvText(
    text: string,
    eol: string,
    newEntries: NewI18nEntry[],
    headerFields: CsvField[],
    fallbackLocale: string
) {
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

/**
 * Add csv text.
 *
 * @param text csv text
 * @param fallbackLocale fallback local
 * @param newEntries new i18n entries that will be maintained
 * @returns csv text
 */
export function addCsvTexts(text: string, fallbackLocale: string, newEntries: NewI18nEntry[]): string {
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
        return addFallbackCsvText(text, eol, newEntries, headerFields, fallbackLocale);
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
}

/**
 * Try add new i18n entries to csv file.
 *
 * @param env cds environment
 * @param path file path
 * @param newI18nEntries new i18n entries that will be maintained
 * @returns boolean
 */
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
