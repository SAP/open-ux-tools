import type {
    RawAnnotation,
    AnnotationRecord,
    PropertyValue,
    Expression,
    Collection,
    AnnotationList
} from '@sap-ux/vocabularies-types';

export type AVTNode = RawAnnotation | AnnotationRecord | PropertyValue | Expression | Collection | AnnotationList;
