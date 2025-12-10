import type { SourceLocation, TraversalStep } from '@eslint/plugin-kit';
import { TextSourceCodeBase } from '@eslint/plugin-kit';

import type { XMLAstNode, XMLDocument, XMLToken } from '@xml-tools/ast';

import { XMLTraversalStep, STEP_PHASE } from './traversal-step';
import type { ProjectContext } from '../../project-context/project-context';

export const visitorKeys: {
    [K in XMLAstNode['type']]: (keyof Extract<XMLAstNode, { type: K }>)[];
} = {
    XMLDocument: ['prolog', 'rootElement'],
    XMLProlog: ['attributes'],
    XMLElement: ['namespaces', 'attributes', 'subElements', 'textContents'],
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
    ast: XMLDocument;
    private aliasMap: Record<string, string> | undefined;

    constructor({ text, ast, projectContext }: { text: string; ast: XMLDocument; projectContext: ProjectContext }) {
        super({ text, ast });
        this.ast = ast;
        this.projectContext = projectContext;
    }

    /**
     * Get alias to namespace map.
     *
     * @returns Alias map.
     */
    getAliasMap(): Record<string, string> {
        if (this.aliasMap) {
            return this.aliasMap;
        }
        const root = this.ast.rootElement;
        this.aliasMap = {};
        if (!root) {
            return this.aliasMap;
        }
        for (const child of root.subElements) {
            if (child.type === 'XMLElement' && child.name === 'Reference') {
                for (const subElement of child.subElements) {
                    if (subElement.type === 'XMLElement' && subElement.name === 'Include') {
                        let namespace: string | undefined;
                        let alias: string | undefined;
                        for (const attribute of subElement.attributes) {
                            if (attribute.key === 'Namespace') {
                                namespace = attribute.value ?? undefined;
                            } else if (attribute.key === 'Alias') {
                                alias = attribute.value ?? undefined;
                            }
                        }
                        if (namespace) {
                            this.aliasMap[namespace] = namespace;
                            if (alias) {
                                this.aliasMap[alias] = namespace;
                            }
                        }
                    }
                }
            }
        }
        return this.aliasMap;
    }

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
     *
     * @returns
     */
    traverse(): Iterable<TraversalStep> {
        const steps: TraversalStep[] = [];
        const visit = (node: XMLAstNode, parent?: XMLAstNode) => {
            steps.push(
                new XMLTraversalStep({
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
                new XMLTraversalStep({
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
