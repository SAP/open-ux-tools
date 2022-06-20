import type { AnnotationFile, Target, Element, Reference } from '@sap-ux/odata-annotation-core-types';
import { TARGET_TYPE, ANNOTATION_FILE_TYPE } from '@sap-ux/odata-annotation-core-types';

/**
 * Merges annotations in a single view.
 *
 * @param files Annotation files to be merged.
 * @returns External targeting annotations.
 */
export function mergeXmlAnnotations(files: AnnotationFile[]): AnnotationFile {
    const targets = new Map<string, Map<string, Element>>();

    const reverseOrderFiles = [...files].reverse();

    for (const file of reverseOrderFiles) {
        for (const target of file.targets) {
            const existingTarget = targets.get(target.name);
            if (existingTarget) {
                mergeTarget(existingTarget, target);
            } else {
                const annotations = new Map<string, Element>();
                mergeTarget(annotations, target);
                targets.set(target.name, annotations);
            }
        }
    }

    return {
        type: ANNOTATION_FILE_TYPE,
        references: reverseOrderFiles.reduce(
            (acc, file): Reference[] => [...acc, ...file.references],
            [] as Reference[]
        ),
        targets: [...targets].map(
            ([key, value]): Target => ({
                type: TARGET_TYPE,
                name: key,
                terms: [...value.values()]
            })
        ),
        uri: 'annotations'
    };
}

/**
 * Mutate source target with the data from overriding target.
 *
 * @param source
 * @param overriding
 */
function mergeTarget(source: Map<string, Element>, overriding: Target): void {
    for (const annotation of overriding.terms) {
        const term = annotation.attributes['Term']?.value;
        const qualifier = annotation.attributes['Qualifier']?.value;
        if (!term) {
            continue; // TODO: test this
        }
        const identifier = qualifier ? `${term}#${qualifier}` : term;
        source.set(identifier, annotation);
    }
}
