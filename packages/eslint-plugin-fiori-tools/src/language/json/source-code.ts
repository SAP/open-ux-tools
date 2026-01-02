import { JSONSourceCode } from '@eslint/json';
import type { DocumentNode } from '@humanwhocodes/momoa';
import type { Manifest } from '@sap-ux/project-access';

import type { ProjectContext } from '../../project-context/project-context';

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
     * Create member string matcher from object path.
     *
     * @param path Path to the node.
     * @returns Matcher string.
     */
    createMatcherString(path: string[]): string {
        return path.map((segment) => `Member[name.value="${segment}"]`).join(' ');
    }

    /**
     * Create a strict member string matcher from object path.
     *
     * This method generates an ESLint selector pattern that strictly validates the hierarchy
     * of JSON properties. Unlike `createMatcherString`, this ensures each property is directly
     * nested within an Object, preventing matches in unrelated parts of the document.
     *
     * @param path - Array of property names representing the path to the target node.
     *               Each element represents a nested level in the JSON structure.
     * @returns A strict selector string that matches only the exact path through nested objects.
     *          The pattern enforces that each property (except the last) must be followed by
     *          an Object before the next property.
     * @example
     * ```typescript
     * // For path: ['sap.ui.generic.app', 'settings', 'createMode']
     * // Returns: 'Member[name.value="sap.ui.generic.app"] > Object > Member[name.value="settings"] > Object > Member[name.value="createMode"]'
     * ```
     */
    createStrictMatcherString(path: string[]): string {
        return path
            .map((segment, index) => {
                const isLast = index === path.length - 1;
                return isLast ? `Member[name.value="${segment}"]` : `Member[name.value="${segment}"] > Object`;
            })
            .join(' > ');
    }
}
