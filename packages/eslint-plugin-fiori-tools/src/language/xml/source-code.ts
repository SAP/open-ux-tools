import type { SourceLocation } from '@eslint/plugin-kit';
import { TextSourceCodeBase } from '@eslint/plugin-kit';

import type { XMLAstNode, XMLDocument, XMLToken } from '@xml-tools/ast';

import { XMLVisitNodeStep, STEP_PHASE } from './traversal-step';
import type { ProjectContext } from '../../project-context/project-context';

export const visitorKeys: {
    [K in XMLAstNode['type']]: (keyof Extract<XMLAstNode, { type: K }>)[];
} = {
    XMLDocument: ['prolog', 'rootElement'],
    XMLProlog: ['attributes'],
    XMLElement: ['attributes', 'subElements', 'textContents'],
    XMLPrologAttribute: [],
    XMLAttribute: [],
    XMLTextContent: []
};

/**
 *
 */
export class FioriXMLSourceCode extends TextSourceCodeBase {
    public readonly projectContext: ProjectContext;
    /**
     * The AST of the source code.
     */
    readonly ast: XMLDocument;

    /**
     * Creates an instance of FioriXMLSourceCode.
     *
     * @param root0 - Object containing text, ast, and projectContext.
     * @param root0.text - The text content of the file.
     * @param root0.ast - The XML AST.
     * @param root0.projectContext - The project context associated with the given file.
     */
    constructor({ text, ast, projectContext }: { text: string; ast: XMLDocument; projectContext: ProjectContext }) {
        super({ text, ast });
        this.ast = ast;
        this.projectContext = projectContext;
    }

    /**
     * Returns the parent of the given node.
     *
     * @param node - The node to get the parent of.
     * @returns The parent of the node.
     * @throws {Error} If the method is not implemented in the subclass.
     */
    getParent(node: XMLAstNode | XMLToken): object | undefined {
        if (isNode(node)) {
            if (node.type === 'XMLDocument') {
                return undefined;
            }
            return node.parent;
        } else {
            return undefined;
        }
    }

    /**
     * Traverse the source code and return the steps that were taken.
     *
     * @returns The steps that were taken while traversing the source code.
     */
    traverse(): Iterable<XMLVisitNodeStep> {
        const steps: XMLVisitNodeStep[] = [];
        const visit = (node: XMLAstNode, parent?: XMLAstNode): void => {
            steps.push(
                new XMLVisitNodeStep({
                    target: node,
                    phase: STEP_PHASE.ENTER,
                    args: [node, parent]
                })
            );

            for (const key of visitorKeys[node.type] ?? []) {
                // @ts-expect-error 7053
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                const child = node[key];

                if (child) {
                    if (Array.isArray(child)) {
                        child.forEach((grandchild) => {
                            visit(grandchild, node);
                        });
                    } else {
                        visit(child, node);
                    }
                }
            }
            steps.push(
                new XMLVisitNodeStep({
                    target: node,
                    phase: STEP_PHASE.EXIT,
                    args: [node, parent]
                })
            );
        };
        visit(this.ast, undefined);

        return steps;
    }

    /**
     * Get location of node or token.
     *
     * @param node - Node or token
     * @returns Location
     */
    getLoc(node: XMLAstNode | XMLToken): SourceLocation {
        if (isNode(node)) {
            return {
                start: {
                    line: node.position.startLine,
                    column: node.position.startColumn
                },
                end: {
                    line: node.position.endLine,
                    column: node.position.endColumn
                }
            };
        }
        return {
            start: {
                line: node.startLine,
                column: node.startColumn
            },
            end: {
                line: node.endLine,
                column: node.endColumn
            }
        };
    }
}

/**
 * Checks if the given object is an XML AST node.
 *
 * @param node - The object to check.
 * @returns True if the object is an XML AST node, false otherwise.
 */
export function isNode(node: XMLAstNode | XMLToken): node is XMLAstNode {
    return (node as XMLAstNode).position !== undefined;
}
