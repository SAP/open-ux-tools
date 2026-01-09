import type { AnnotationFile } from '@sap-ux/odata-annotation-core';
import { getXmlServiceArtifacts } from '@sap-ux/fiori-annotation-api';

import type { ProjectContext } from '../../../src/project-context/project-context';
import { FioriAnnotationSourceCode } from '../../../src/language/annotations/source-code';
import { STEP_PHASE } from '../../../src/language/annotations/traversal-step';
import { getAnnotationsAsXmlCode, V4_ANNOTATIONS, V4_METADATA } from '../../test-helper';

function getAst(annotations?: string): AnnotationFile {
    const annotationContent = annotations ? getAnnotationsAsXmlCode(V4_ANNOTATIONS, annotations) : V4_ANNOTATIONS;
    const fileCache = new Map<string, string>([
        ['metadata.xml', V4_METADATA],
        ['annotations.xml', annotationContent]
    ]);
    const artifacts = getXmlServiceArtifacts(
        '4.0',
        '',
        {
            uri: 'metadata.xml',
            isReadOnly: true
        },
        [
            {
                uri: 'metadata.xml',
                isReadOnly: true
            },
            {
                uri: 'annotations.xml',
                isReadOnly: false
            }
        ],
        fileCache
    );

    return artifacts.annotationFiles['annotations.xml'];
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const DUMMY_PROJECT_CONTEXT: ProjectContext = {} as any;

describe('FioriAnnotationSourceCode', () => {
    it('should create an instance correctly', () => {
        const ast = getAst();
        const sourceCode = new FioriAnnotationSourceCode({
            text: V4_ANNOTATIONS,
            ast,
            projectContext: DUMMY_PROJECT_CONTEXT
        });

        expect(sourceCode.text).toBe(V4_ANNOTATIONS);
        expect(sourceCode.ast).toBe(ast);
    });

    it('should traverse the Annotation AST correctly', () => {
        const ast = getAst(
            `<Annotations Target="IncidentService.Incidents"><Annotation Term="UI.LineItem"></Annotation></Annotations>`
        );
        const sourceCode = new FioriAnnotationSourceCode({
            text: V4_ANNOTATIONS,
            ast,
            projectContext: DUMMY_PROJECT_CONTEXT
        });

        const traversalSteps = Array.from(sourceCode.traverse());

        const expectedNodeTypes = [
            'annotation-file',
            'reference',
            'reference',
            'reference',
            'reference',
            'reference',
            'namespace',
            'target',
            'element',
            'attribute'
        ];

        const traversedNodeTypes = traversalSteps
            .filter((step) => step.phase === STEP_PHASE.ENTER)
            .map((step) => step.target.type);

        expect(traversedNodeTypes).toEqual(expectedNodeTypes);
    });
});
