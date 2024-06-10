import type { AnnotationFile, Namespace, Range, Reference } from '@sap-ux/odata-annotation-core-types';
import type { Target } from '@sap-ux/cds-odata-annotation-converter';
import type { Assignment, AnnotationNode } from '@sap-ux/cds-annotation-parser';

import type { Comment } from './comments';
import type { CompilerToken } from './cds-compiler-tokens';

export const CDS_DOCUMENT_TYPE = 'document';
export type CDSDocument = {
    type: typeof CDS_DOCUMENT_TYPE;
    uri: string;
    namespace?: Namespace;
    references: Reference[];
    targets: Target[];
    range?: Range;
};

export interface Document {
    uri: string;
    ast: CDSDocument;
    comments: Comment[];
    tokens: CompilerToken[];
    annotationFile: AnnotationFile;
}

export type AstNode = Reference | Target | Assignment | AnnotationNode | CDSDocument;
