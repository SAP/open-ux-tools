import { OdataVersion } from '../types';

interface AnnotationLibsEntry {
    annotation: string;
    library: string;
}

type AnnotationLibs = {
    [OdataVersion.v4]: [AnnotationLibsEntry] | [];
};

export const annotationLibs: AnnotationLibs = {
    [OdataVersion.v4]: [
        {
            annotation: 'UI.Note',
            library: 'sap.nw.core.gbt.notes.lib.reuse'
        }
    ]
};

/**
 * Returns the reuse libraries associated with annotation entries in the metadata
 *
 * @param version - the odata service version
 * @param metadata - metadata string to be checked for specific annotations
 * @returns The base component library path
 */
export function getAnnotationLibs(version: OdataVersion, metadata: string) {
    const libraries: string[] = [];
    const annotationsFound = new Set();

    if (version === OdataVersion.v4) {
        // Create a regular expression that matches any of the annotations
        const annotationsRegex = new RegExp(
            annotationLibs[OdataVersion.v4]
                ?.map((annotationLib: { annotation: any }) => annotationLib.annotation)
                .join('|'),
            'g'
        );

        let match;
        match = annotationsRegex.exec(metadata);
        match?.forEach((found) => {
            annotationsFound.add(found);
        });

        // Add corresponding dependencies based on found annotations
        annotationsFound.forEach((annotation) => {
            const rule = annotationLibs[OdataVersion.v4]?.find((rule) => rule.annotation === annotation);
            if (rule) {
                libraries.push(rule.library);
            }
        });
    }

    return Array.from(libraries);
}
