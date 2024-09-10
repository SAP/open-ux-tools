import { TextDocument } from 'vscode-languageserver-textdocument';
import type { TextEdit } from 'vscode-languageserver-textdocument';
import type { CdsEnvironment, NewI18nEntry } from '../../types';
import {
    getI18nConfiguration,
    jsonPath,
    discoverIndent,
    applyIndent,
    discoverLineEnding,
    doesExist,
    readFile,
    writeFile
} from '../../utils';
import { Range } from '@sap-ux/text-document-utils';
import type { Node } from 'jsonc-parser';
import { parseTree } from 'jsonc-parser';
import type { Editor } from 'mem-fs-editor';

/**
 * Create full bundle.
 *
 * @param fallbackLocale fallback local
 * @param newEntries new i18n entries that will be maintained
 * @returns fallback key with i18n bundle
 */
function createFullBundle(fallbackLocale: string, newEntries: NewI18nEntry[]): Record<string, Record<string, string>> {
    const fallbackBundle = newEntries.reduce((acc: Record<string, string>, entry) => {
        acc[entry.key] = entry.value;
        return acc;
    }, {});
    return {
        [fallbackLocale]: fallbackBundle
    };
}

/**
 * Get text document.
 *
 * @param text json text
 * @returns text document instance
 */
const getTextDocument = (text: string) => TextDocument.create('', '', 0, text);

/**
 * Add json text to fallback node.
 *
 * @param text json text
 * @param fallbackLocale fallback node
 * @param fallbackLocaleNode fallback local node
 * @param indent indentation
 * @param eol end of line
 * @param newEntries new i18n entries that will be maintained
 * @returns text string
 */
function addToExistingFallbackLocalNode(
    text: string,
    fallbackLocale: string,
    fallbackLocaleNode: Node,
    indent: string,
    eol: string,
    newEntries: NewI18nEntry[]
): string {
    const bundleNode = (fallbackLocaleNode.children ?? [])[1];
    const textNodes = bundleNode?.children ?? [];
    if (textNodes.length) {
        const document = getTextDocument(text);
        const position = document.positionAt(textNodes[0].offset);
        let newText = '';
        for (const entry of newEntries) {
            newText += `${indent + indent}"${entry.key}": "${entry.value}",${eol}`;
        }
        const edit: TextEdit = {
            newText: newText,
            range: Range.create(position.line, 0, position.line, 0)
        };

        return TextDocument.applyEdits(document, [edit]);
    }
    if (bundleNode?.offset) {
        const document = getTextDocument(text);
        const start = document.positionAt(bundleNode.offset);
        const end = document.positionAt(bundleNode.offset + bundleNode.length);
        const bundle = createFullBundle(fallbackLocale, newEntries);
        const newText = JSON.stringify(bundle[fallbackLocale], undefined, indent);
        const indented = applyIndent(`${newText}`, indent, eol, false);
        const edit: TextEdit = {
            newText: indented,
            range: Range.create(start, end)
        };

        return TextDocument.applyEdits(document, [edit]);
    }
    return text;
}

/**
 * Add json text.
 *
 * @param text json text
 * @param fallbackLocale fallback local i18n
 * @param newEntries new i18n entries that will be maintained
 * @returns text string
 */
export function addJsonTexts(text: string, fallbackLocale: string, newEntries: NewI18nEntry[]): string {
    if (text === '') {
        const bundle = createFullBundle(fallbackLocale, newEntries);
        return JSON.stringify(bundle, undefined, 4);
    }

    const rootNode = parseTree(text);
    if (rootNode?.type !== 'object') {
        return text;
    }

    const localeNodes = rootNode.children ?? [];
    const eol = discoverLineEnding(text);
    const indent = discoverIndent(text);
    if (localeNodes.length === 0) {
        const bundle = createFullBundle(fallbackLocale, newEntries);
        return JSON.stringify(bundle, undefined, 4);
    }

    const fallbackLocaleNode = localeNodes.find((node) => (node.children ?? [])[0]?.value === fallbackLocale);
    if (fallbackLocaleNode) {
        return addToExistingFallbackLocalNode(text, fallbackLocale, fallbackLocaleNode, indent, eol, newEntries);
    }

    // create new entries with local fallback
    const document = getTextDocument(text);
    const [last] = localeNodes.slice(-1);
    const position = document.positionAt(last.offset);

    const bundle = createFullBundle(fallbackLocale, newEntries);
    const newText = JSON.stringify(bundle[fallbackLocale], undefined, indent);

    const indented = applyIndent(`"${fallbackLocale}": ${newText},`, indent, eol);

    const edit: TextEdit = {
        newText: indented + eol,
        range: Range.create(position.line, 0, position.line, 0)
    };

    return TextDocument.applyEdits(document, [edit]);
}

/**
 * Try add new i18n entries to json file.
 *
 * @param env cds environment
 * @param path file path
 * @param newI18nEntries new i18n entries that will be maintained
 * @param fs optional `mem-fs-editor` instance. If provided, `mem-fs-editor` api is used instead of `fs` of node
 * @returns boolean
 */
export async function tryAddJsonTexts(
    env: CdsEnvironment,
    path: string,
    newI18nEntries: NewI18nEntry[],
    fs?: Editor
): Promise<boolean> {
    const i18nFilePath = jsonPath(path);
    if (!(await doesExist(i18nFilePath))) {
        return false;
    }
    const { fallbackLanguage } = getI18nConfiguration(env);
    const content = await readFile(i18nFilePath, fs);
    const newContent = addJsonTexts(content, fallbackLanguage, newI18nEntries);
    await writeFile(i18nFilePath, newContent, fs);
    return true;
}
