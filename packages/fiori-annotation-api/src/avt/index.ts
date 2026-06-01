export { convertAnnotationFile, type AnnotationListWithOrigins } from './annotations.js';
export { convertMetadataToAvtSchema } from './metadata.js';
export {
    convertAnnotationToInternal,
    convertDynamicExpressionToInternal,
    convertCollectionElement,
    convertCollectionToInternal,
    convertExpressionToInternal,
    convertPrimitiveValueToInternal,
    convertPropertyValueToInternal,
    convertRecordToInternal,
    convertTargetAnnotationsToInternal
} from './to-internal.js';
export { convertPointerInAnnotationToInternal } from './pointer.js';
export { resolvePath, isAnnotation, isAnnotationList, isCollection, isRecord } from './utils.js';
export { type AVTNode } from './types.js';
export { getAvtNodeFromPointer, findAnnotation, findAnnotationByReference } from './find.js';
export { isExpression } from './expressions.js';
