import { printOptions as defaultPrintOptions } from '@sap-ux/odata-annotation-core';
import { TARGET_TYPE } from '@sap-ux/cds-odata-annotation-converter';

import type { AstNode, CDSDocument } from './document';
import { getAstNodesFromPointer } from './pointer';
import type { CompilerToken } from './cds-compiler-tokens';
import { createTokenRange, findLastTokenBeforePosition, tokenColumn, tokenLine } from './cds-compiler-tokens';

const printOptions: typeof defaultPrintOptions = { ...defaultPrintOptions, useSnippetSyntax: false };
const ANNOTATE_PATTERN = /annotate/i;

/**
 * Finds the indentation level matching to the node of a pointer.
 *
 * @param document - CDS document root.
 * @param tokens - All tokens in the document.
 * @param pointer - Pointer to a node for which indentation will be returned.
 * @returns Indentation level of the node matching the pointer.
 */
export function getIndentLevelFromPointer(document: CDSDocument, tokens: CompilerToken[], pointer: string): number {
    const path = getAstNodesFromPointer(document, pointer).reverse();
    const node = path.shift();
    if (!node) {
        return 0;
    }

    return getIndentLevelFromNode(tokens, node);
}

/**
 * Finds the indentation level of a node.
 *
 * @param tokens - All tokens in the document.
 * @param node - Node for which indentation will be returned.
 * @returns Indentation level of the node.
 */
export function getIndentLevelFromNode(tokens: CompilerToken[], node: AstNode): number {
    const width = printOptions.useTabs ? 1 : printOptions.tabWidth;
    const startCharacter = getLineStartCharacter(node, tokens);
    const indentLevel = startCharacter / width;
    return Math.floor(indentLevel);
}

function getLineStartCharacter(node: AstNode, tokens: CompilerToken[]): number {
    if (!node?.range) {
        return 0;
    }
    if (node.type === TARGET_TYPE && node.range) {
        const token = findLastTokenBeforePosition(ANNOTATE_PATTERN, tokens, node.range.end);
        if (node.kind === 'element' && node.nameRange) {
            const range = token ? createTokenRange(token) : undefined;
            if (token && range?.start?.line === node.nameRange.start.line) {
                // element is in the same line as the annotate statement, so we should use the indent level of the annotate statement
                return tokenColumn(token);
            }
            return node.nameRange.start.character;
        }
        if (token) {
            return tokenColumn(token);
        }
    }
    const token = findFirstTokenOfLine(tokens, node.range.start.line);
    return token ? tokenColumn(token) : 0;
}

function findFirstTokenOfLine(tokens: CompilerToken[], nodeLine: number): CompilerToken | undefined {
    // use binary search to find a token at the same line
    let left = 0;
    let right = tokens.length;
    while (left <= right) {
        const middle = Math.floor((left + right) / 2);
        let token = tokens[middle];
        const line = tokenLine(token);
        if (line < nodeLine) {
            left = middle + 1;
        } else if (line > nodeLine) {
            right = middle - 1;
        } else {
            // we found a token in correct line, search for first token of the line
            let index = middle - 1;
            let previousToken = tokens[index];
            while (previousToken && line === tokenLine(previousToken)) {
                token = previousToken;
                previousToken = tokens[index];
                index--;
            }
            return token;
        }
    }
    return undefined;
}
