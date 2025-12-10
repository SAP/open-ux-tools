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
    /**
     * Constructor.
     *
     * @param param0 - Parameters
     * @param param0.text - The source text
     * @param param0.ast - The AST of the source code
     * @param param0.projectContext - The project context
     */
    constructor({ text, ast, projectContext }: { text: string; ast: DocumentNode; projectContext: ProjectContext }) {
        super({ text, ast });
        this.projectContext = projectContext;
    }
}
