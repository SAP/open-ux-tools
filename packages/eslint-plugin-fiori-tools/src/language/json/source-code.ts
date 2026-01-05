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
     * Create a member string matcher from object path.
     *
     * This method generates an ESLint selector pattern to match JSON properties based on a path.
     * It supports both descendant and direct child matching strategies.
     *
     * @param path - Array of property names representing the path to the target node.
     *               Each element represents a nested level in the JSON structure.
     * @param options - Optional configuration object.
     * @param options.strict - When true, enforces strict hierarchy validation with direct child
     *                         selectors (>), ensuring each property is directly nested within an
     *                         Object. When false (default), uses descendant selectors ( ) that
     *                         allow matches at any nesting level.
     * @returns A selector string that matches the specified path through nested objects.
     *
     * @example
     * ```typescript
     * // Descendant matching (default):
     * createMatcherString(['sap.ui.generic.app', 'settings', 'createMode'])
     * // Returns: 'Member[name.value="sap.ui.generic.app"] Member[name.value="settings"] Member[name.value="createMode"]'
     *
     * // Strict matching:
     * createMatcherString(['sap.ui.generic.app', 'settings', 'createMode'], { strict: true })
     * // Returns: 'Member[name.value="sap.ui.generic.app"] > Object > Member[name.value="settings"] > Object > Member[name.value="createMode"]'
     * ```
     */
    createMatcherString(path: string[], options?: { strict?: boolean }): string {
        const strict = options?.strict ?? false;

        if (strict) {
            return path
                .map((segment, index) => {
                    const isLast = index === path.length - 1;
                    return isLast ? `Member[name.value="${segment}"]` : `Member[name.value="${segment}"] > Object`;
                })
                .join(' > ');
        }

        return path.map((segment) => `Member[name.value="${segment}"]`).join(' ');
    }
}
