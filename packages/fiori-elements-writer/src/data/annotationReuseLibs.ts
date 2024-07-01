import { OdataVersion } from '../types';

type AnnotationLibs = {
    annotation: string;
    library: string;
};

export const annotationLibs: AnnotationLibs[] = [
    {
        annotation: 'UI.Note',
        library: 'sap.nw.core.gbt.notes.lib.reuse'
    }
];

/**
 * Returns the reuse libraries associated with annotation entries in the metadata
 *
 * @param metadata - metadata string to be checked for specific annotations
 * @returns The base component library path
 */
export function getAnnotationV4Libs(metadata: string) {
    const libraries: string[] = [];
    const annotationsFound = new Set();

    // Create a regular expression that matches any of the annotations
    const annotationsRegex = new RegExp(
        annotationLibs.map((annotationLib: { annotation: string }) => annotationLib.annotation).join('|'),
        'g'
    );

    let match;
    match = annotationsRegex.exec(metadata);
    match?.forEach((found) => {
        annotationsFound.add(found);
    });

    // Add corresponding dependencies based on found annotations
    annotationsFound.forEach((annotation) => {
        const rule = annotationLibs.find((rule) => rule.annotation === annotation);
        if (rule) {
            libraries.push(rule.library);
        }
    });

    return Array.from(libraries);
}
