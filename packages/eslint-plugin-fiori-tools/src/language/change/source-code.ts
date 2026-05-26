import type { DocumentNode } from '@humanwhocodes/momoa';
import type { ProjectContext } from '../../project-context/project-context';
import { JSONSourceCode } from '@eslint/json';

/**
 * A copy of FioriJSONSourceCode
 */
export class FioriChangeSourceCode extends JSONSourceCode {
    public readonly projectContext: ProjectContext;
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
}
