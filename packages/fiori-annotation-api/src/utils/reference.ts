import type { AnnotationReference } from '../types';

/**
 * Serializes annotation reference to a string identifier.
 *
 * @param reference - Reference that will be serialized.
 * @param uri - Uri which will be included in the identifier. If omitted, then annotations from different files can not be distinguished by the identifier.
 * @returns Identifier for a specific annotation with Target/Term/Qualifier combination.
 */
export function annotationReferenceToString(reference: AnnotationReference, uri?: string): string {
    const qualifierSuffix = reference.qualifier ? `#${reference.qualifier}` : '';
    const annotation = `${reference.target}/${reference.term}${qualifierSuffix}`;
    if (uri) {
        return `${uri} ${annotation}`;
    }
    return annotation;
}
