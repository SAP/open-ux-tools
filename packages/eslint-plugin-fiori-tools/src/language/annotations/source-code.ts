import type { SourceLocation } from '@eslint/plugin-kit';
import { TextSourceCodeBase } from '@eslint/plugin-kit';

import type { AnnotationFile, AnyNode, Attribute } from '@sap-ux/odata-annotation-core';
import {
    ANNOTATION_FILE_TYPE,
    ATTRIBUTE_TYPE,
    ELEMENT_TYPE,
    NAMESPACE_TYPE,
    REFERENCE_TYPE,
    TARGET_TYPE,
    TEXT_TYPE
} from '@sap-ux/odata-annotation-core';

import { AnnotationVisitNodeStep, STEP_PHASE } from './traversal-step';
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

    /**
     * Creates an instance of FioriAnnotationSourceCode.
     *
     * @param root0 - Object containing text, ast, and projectContext.
     * @param root0.text - The text content of the file.
     * @param root0.ast - The Annotation AST.
     * @param root0.projectContext - The project context associated with the given file.
     */
    constructor({ text, ast, projectContext }: { text: string; ast: AnnotationFile; projectContext: ProjectContext }) {
        super({ text, ast });
        this.ast = ast;
        this.projectContext = projectContext;
    }

    /**
     * Traverse the source code and return the steps that were taken.
     *
     * @returns The steps that were taken while traversing the source code.
     */
    traverse(): Iterable<AnnotationVisitNodeStep> {
        const steps: AnnotationVisitNodeStep[] = [];
        const visit = (node: AnyNode, parent?: AnyNode): void => {
            steps.push(
                new AnnotationVisitNodeStep({
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
                        for (const grandchild of child) {
                            visit(grandchild, node);
                        }
                    } else if (node.type === 'element' && key === 'attributes') {
                        for (const grandchild of Object.values(child as Record<string, Attribute>)) {
                            visit(grandchild, node);
                        }
                    } else {
                        visit(child, node);
                    }
                }
            }
            steps.push(
                new AnnotationVisitNodeStep({
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
