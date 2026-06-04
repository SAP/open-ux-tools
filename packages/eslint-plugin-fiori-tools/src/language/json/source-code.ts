import { JSONSourceCode } from '@eslint/json';
import type { AnyNode, DocumentNode, MemberNode } from '@humanwhocodes/momoa';
import type { Manifest } from '@sap-ux/project-access';

import type { ProjectContext } from '../../project-context/project-context.js';

/**
 * JSON Source Code class for Fiori tools.
 */
export class FioriJSONSourceCode extends JSONSourceCode {
    public readonly projectContext: ProjectContext;
    public readonly manifest: Manifest;
    public readonly uri: string;
    /**
     * Constructor.
     *
     * @param param0 - Parameters
     * @param param0.text - The source text
     * @param param0.ast - The AST of the source code
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
        ast: DocumentNode;
        projectContext: ProjectContext;
        uri: string;
    }) {
        super({ text, ast });
        this.uri = uri;
        this.projectContext = projectContext;
    }

    /**
     * Create a member string matcher from object path.
     *
     * This method generates an ESQuery selector pattern to match JSON properties based on a path.
     * Enforces strict hierarchy validation with direct child selectors (>),
     * ensuring each property is directly nested within an Object.
     *
     * @param path - Array of property names representing the path to the target node.
     *               Each element represents a nested level in the JSON structure.
     * @returns A selector string that matches the specified path through nested objects.
     * @example
     * ```typescript
     * createMatcherString(['sap.ui.generic.app', 'settings', 'createMode'], { strict: true })
     * // Returns: 'Member[name.value="sap.ui.generic.app"] > Object > Member[name.value="settings"] > Object > Member[name.value="createMode"]'
     * ```
     */
    createMatcherString(path: string[]): string {
        return path
            .map((segment, index) => {
                const isLast = index === path.length - 1;
                return isLast ? `Member[name.value="${segment}"]` : `Member[name.value="${segment}"] > Object`;
            })
            .join(' > ');
    }

    /**
     * Gets the node by provided json path.
     * Looks from provided starting node. You can begin search from ast body node.
     * If node is not found, returns the parent of the node.
     *
     * @param node - Initial node, start from ast body or closer to the searched node
     * @param path - Path to the node
     * @param parentNode - Optional parent node of the searched node
     * @returns
     */
    getNode(node: AnyNode | undefined, path: string[], parentNode?: MemberNode): AnyNode | undefined {
        if (node && path.length) {
            const name = path[0];
            if (node.type === 'Object') {
                node = node.members.find((n) => {
                    if (n.name.type === 'String') {
                        return n.name.value === name;
                    }
                    return false;
                });
                if (node) {
                    return this.getNode(node, path, parentNode);
                }
            } else if (node.type === 'Member' && path.length > 1) {
                parentNode = node;
                // Report the final node, not value of the final node
                return this.getNode(node.value, path.slice(1), parentNode);
            }
        }
        return node ?? parentNode;
    }
}
