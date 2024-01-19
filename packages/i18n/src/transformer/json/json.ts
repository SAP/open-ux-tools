import { parseTree } from 'jsonc-parser';
import type { Node } from 'jsonc-parser';
import type { I18nBundle, I18nEntry, TextNode } from '../../types';
import { Position, Range, getLineOffsets, positionAt } from '../../parser/utils';

const createTextNode = (value: string, range: Range): TextNode => {
    return {
        value,
        range
    };
};

const toTextNode = (node: Node | undefined, lineOffsets: number[], contentLength: number): TextNode | undefined => {
    if (node) {
        switch (typeof node.value) {
            case 'string': {
                // for string literals node offset starts with '"' character, but we don't include it in the text node range
                const start = positionAt(lineOffsets, node.offset + 1, contentLength);
                const { value } = node;
                return createTextNode(
                    value,
                    Range.create(start, Position.create(start.line, start.character + value.length))
                );
            }
            case 'number': {
                const start = positionAt(lineOffsets, node.offset, contentLength);
                const value = node.value.toString();
                return createTextNode(
                    value,
                    Range.create(start, Position.create(start.line, start.character + value.length))
                );
            }
            case 'boolean': {
                const start = positionAt(lineOffsets, node.offset, contentLength);
                // CDS currently uses the boolean value if its true, otherwise falls back to using the key
                const value = node.value ? 'true' : '';
                return createTextNode(
                    value,
                    Range.create(start, Position.create(start.line, start.character + value.length))
                );
            }
            default: {
                const start = positionAt(lineOffsets, node.offset, contentLength);
                return createTextNode('', Range.create(start, start));
            }
        }
    }
};

export const jsonToI18nBundle = (text: string, filePath = ''): I18nBundle => {
    const bundle: I18nBundle = {};
    const rootNode = parseTree(text);
    const lineOffsets = getLineOffsets(text);
    const contentLength = text.length;

    if (rootNode?.type !== 'object') {
        return bundle;
    }
    const localeNodes = rootNode.children ?? [];
    for (const localeNode of localeNodes) {
        if (localeNode.type === 'property') {
            const entries: I18nEntry[] = [];
            const locale = (localeNode.children ?? [])[0]?.value ?? '';
            bundle[locale] = entries;
            const textNodes = (localeNode.children ?? [])[1]?.children ?? [];
            for (const textNode of textNodes) {
                if (textNode.type === 'property') {
                    const key = toTextNode((textNode.children ?? [])[0], lineOffsets, contentLength);
                    const value = toTextNode((textNode.children ?? [])[1], lineOffsets, contentLength);
                    if (key && value) {
                        entries.push({
                            filePath,
                            key,
                            value
                        });
                    }
                }
            }
        }
    }

    return bundle;
};
