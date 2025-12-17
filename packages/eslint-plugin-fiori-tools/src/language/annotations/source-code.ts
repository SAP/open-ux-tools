import type { SourceLocation, TraversalStep } from '@eslint/plugin-kit';
import { TextSourceCodeBase } from '@eslint/plugin-kit';

import type { AnnotationFile } from '@sap-ux/odata-annotation-core';
import {
    ANNOTATION_FILE_TYPE,
    ATTRIBUTE_TYPE,
    ELEMENT_TYPE,
    NAMESPACE_TYPE,
    REFERENCE_TYPE,
    TARGET_TYPE,
    TEXT_TYPE,
    type AnyNode
} from '@sap-ux/odata-annotation-core';

import { AnnotationTraversalStep, STEP_PHASE } from './traversal-step';
import type { ProjectContext } from '../../project-context/project-context';

export const visitorKeys: {
    [K in AnyNode['type']]: (keyof Extract<AnyNode, { type: K }>)[];
} = {
    [ANNOTATION_FILE_TYPE]: ['references', 'namespace', 'targets'],
    [ELEMENT_TYPE]: ['attributes', 'content'],
    [NAMESPACE_TYPE]: [],
    [REFERENCE_TYPE]: [],
    [TARGET_TYPE]: ['terms'],
    [ATTRIBUTE_TYPE]: [],
    [TEXT_TYPE]: []
};

/**
 * Annotation Source Code representation.
 */
export class FioriAnnotationSourceCode extends TextSourceCodeBase {
    public readonly projectContext: ProjectContext;
    /**
     * The AST of the source code.
     */
    ast: AnnotationFile;

    constructor({ text, ast, projectContext }: { text: string; ast: AnnotationFile; projectContext: ProjectContext }) {
        super({ text, ast });
        this.ast = ast;
        this.projectContext = projectContext;
    }

    /**
     * Traversal of AST.
     * 
     * @returns
     */
    traverse(): Iterable<TraversalStep> {
        const steps: TraversalStep[] = [];
        const visit = (node: AnyNode, parent?: AnyNode) => {
            steps.push(
                new AnnotationTraversalStep({
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
                new AnnotationTraversalStep({
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
    getLoc(node: AnyNode): SourceLocation {
        if (!node.range) {
            throw new Error('Node has no range');
        }
        return {
            start: {
                line: node.range.start.line + 1,
                column: node.range.start.character + 1
            },
            end: {
                line: node.range.end.line + 1,
                column: node.range.end.character + 1
            }
        };
    }
}
