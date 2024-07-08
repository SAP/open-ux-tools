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
 * @description Returns the reuse libraries associated with annotation entries in the metadata.
 * @param metadata - metadata string to be checked for specific annotations
 * @returns The base component library path
 */
export function getAnnotationV4Libs(metadata: string) {
    const libraries: string[] = [];

    // Create a regular expression that matches any of the annotations
    const annotationsRegex = new RegExp(
        annotationLibs.map((annotationLib: { annotation: string }) => annotationLib.annotation).join('|'),
        'g'
    );

    const foundAnnotations = annotationsRegex.exec(metadata);
    foundAnnotations?.forEach((annotation) => {
        const rule = annotationLibs.find((rule) => rule.annotation === annotation);
        if (rule) {
            libraries.push(rule.library);
        }
    });

    return Array.from(libraries);
}
