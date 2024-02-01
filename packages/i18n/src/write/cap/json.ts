import { TextDocument } from 'vscode-languageserver-textdocument';
import type { TextEdit } from 'vscode-languageserver-textdocument';
import type { CdsEnvironment, NewI18nEntry } from '../../types';
import {
    getI18nConfiguration,
    jsonPath,
    discoverIndent,
    applyIndent,
    discoverLineEnding,
    doesExist
} from '../../utils';
import { promises } from 'fs';
import { Range } from '../../parser/utils';
import type { Node } from 'jsonc-parser';
import { parseTree } from 'jsonc-parser';

function createFullBundle(fallbackLocale: string, newEntries: NewI18nEntry[]): Record<string, Record<string, string>> {
    const fallbackBundle = newEntries.reduce((acc: Record<string, string>, entry) => {
        acc[entry.key] = entry.value;
        return acc;
    }, {});
    return {
        [fallbackLocale]: fallbackBundle
    };
}
const getTextDocument = (text: string) => TextDocument.create('', '', 0, text);

const addToExistingFallbackLocalNode = (
    text: string,
    fallbackLocale: string,
    fallbackLocaleNode: Node,
    indent: string,
    eol: string,
    newEntries: NewI18nEntry[]
): string => {
    const bundleNode = (fallbackLocaleNode.children ?? [])[1];
    const textNodes = bundleNode?.children ?? [];
    if (textNodes.length) {
        const document = getTextDocument(text);
        const position = document.positionAt(textNodes[0].offset);
        let newText = '';
        for (let i = 0; i < newEntries.length; i++) {
            const entry = newEntries[i];
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
};

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

export async function tryAddJsonTexts(
    env: CdsEnvironment,
    path: string,
    newI18nEntries: NewI18nEntry[]
): Promise<boolean> {
    const i18nFilePath = jsonPath(path);
    if (!(await doesExist(i18nFilePath))) {
        return false;
    }
    const { fallbackLanguage } = getI18nConfiguration(env);
    const content = await promises.readFile(i18nFilePath, { encoding: 'utf8' });
    const newContent = addJsonTexts(content, fallbackLanguage, newI18nEntries);
    await promises.writeFile(i18nFilePath, newContent, { encoding: 'utf8' });
    return true;
}
