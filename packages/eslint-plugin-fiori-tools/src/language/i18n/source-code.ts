import type { SourceLocation } from '@eslint/plugin-kit';
import { TextSourceCodeBase } from '@eslint/plugin-kit';

import type { ProjectContext } from '../../project-context/project-context.js';
import { I18nVisitNodeStep, STEP_PHASE } from './traversal-step.js';

/**
 * A single key=value entry in a .properties file.
 */
export interface I18nEntry {
    type: 'i18n-entry';
    key: { value: string; range: SourceLocation };
    value: { value: string; range: SourceLocation };
}

/**
 * Root AST node representing a parsed .properties file.
 */
export interface I18nDocument {
    type: 'i18n-document';
    entries: I18nEntry[];
    loc: SourceLocation;
}

export type I18nNode = I18nDocument | I18nEntry;

/**
 * Visitor keys mapping i18n node types to their traversable child properties.
 */
export const visitorKeys: { [K in I18nNode['type']]: string[] } = {
    'i18n-document': ['entries'],
    'i18n-entry': []
};

/**
 * Parses the text content of a .properties file into an I18nDocument AST with location info.
 * Comment lines (starting with # or !) and empty lines are skipped.
 *
 * @param text - Raw content of the .properties file
 * @returns Parsed I18nDocument AST
 */
export function parseI18nToAst(text: string): I18nDocument {
    const entries: I18nEntry[] = [];
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('!')) {
            continue;
        }
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx > 0) {
            const lineIdx = i + 1; // 1-based line number for SourceLocation
            const valueStartIdx = eqIdx + 1;
            entries.push({
                type: 'i18n-entry',
                key: {
                    value: trimmed.slice(0, eqIdx).trim(),
                    range: { start: { line: lineIdx, column: 1 }, end: { line: lineIdx, column: valueStartIdx } }
                },
                value: {
                    value: trimmed.slice(valueStartIdx),
                    range: {
                        start: { line: lineIdx, column: valueStartIdx + 1 },
                        end: { line: lineIdx, column: line.length + 1 }
                    }
                }
            });
        }
    }
    const lastLineIndex = lines.length - 1;
    return {
        type: 'i18n-document',
        entries,
        loc: {
            start: { line: 1, column: 0 },
            end: { line: lines.length, column: lines[lastLineIndex]?.length ?? 0 }
        }
    };
}

/**
 * Source Code class for i18n .properties files.
 */
export class FioriI18nSourceCode extends TextSourceCodeBase {
    public readonly projectContext: ProjectContext;
    public readonly uri: string;
    ast: I18nDocument;

    /**
     * Constructor.
     *
     * @param param0 - Parameters
     * @param param0.text - The source text
     * @param param0.ast - The parsed I18nDocument AST
     * @param param0.projectContext - The project context
     * @param param0.uri - The document URI
     */
    constructor({
        text,
        ast,
        projectContext,
        uri
    }: {
        text: string;
        ast: I18nDocument;
        projectContext: ProjectContext;
        uri: string;
    }) {
        super({ text, ast });
        this.ast = ast;
        this.uri = uri;
        this.projectContext = projectContext;
    }

    /**
     * Traverse the i18n document AST and return the visit steps.
     *
     * @returns Iterable of visit steps over the document and its entries
     */
    traverse(): Iterable<I18nVisitNodeStep> {
        const steps: I18nVisitNodeStep[] = [];
        const visit = (node: I18nNode, parent?: I18nNode): void => {
            steps.push(
                new I18nVisitNodeStep({
                    target: node,
                    phase: STEP_PHASE.ENTER,
                    args: [node, parent]
                })
            );
            if (node.type === 'i18n-document') {
                for (const entry of node.entries) {
                    visit(entry, node);
                }
            }
            steps.push(
                new I18nVisitNodeStep({
                    target: node,
                    phase: STEP_PHASE.EXIT,
                    args: [node, parent]
                })
            );
        };
        visit(this.ast);
        return steps;
    }

    /**
     * Returns the source location of an i18n AST node.
     *
     * @param node - An I18nDocument or I18nEntry node
     * @returns ESLint SourceLocation for the node
     */
    getLoc(node: I18nNode): SourceLocation {
        if ('loc' in node) {
            return node.loc;
        }
        // Return value range for I18nEntry nodes
        return {
            start: node.value.range.start,
            end: node.value.range.end
        };
    }
}
