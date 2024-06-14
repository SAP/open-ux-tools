import type { AnnotationFile } from '@sap-ux/odata-annotation-core-types';
import type { XMLDocument } from '@xml-tools/ast';
import type { Comment } from './comments';

export interface Document {
    uri: string;
    ast: XMLDocument;
    comments: Comment[];
    annotationFile: AnnotationFile;
    usedNamespaces: Set<string>;
}
