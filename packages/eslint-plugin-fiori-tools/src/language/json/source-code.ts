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
}
