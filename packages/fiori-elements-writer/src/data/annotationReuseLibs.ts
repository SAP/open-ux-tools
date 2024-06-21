import { OdataVersion } from '../types';

interface AnnotationReuseLibsEntry {
    annotation: string;
    reuseLib: string;
}

type AnnotationReuseLibs = {
    [V in OdataVersion]: [AnnotationReuseLibsEntry] | [];
};

export const annotationReuseLibs: AnnotationReuseLibs = {
    [OdataVersion.v2]: [],
    [OdataVersion.v4]: [
        {
            annotation: 'UI.Note',
            reuseLib: 'sap.nw.core.gbt.notes.lib.reuse'
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
export function getAnnotationLibs(version: OdataVersion, metadata?: string) {
    const reuseLibs: string[] = [];
    const annotationsFound = new Set();

    // Create a regular expression that matches any of the annotations
    const annotationsRegex = new RegExp(
        annotationReuseLibs[version]
            ?.map((annotationReuseLib: { annotation: any }) => annotationReuseLib.annotation)
            .join('|'),
        'g'
    );

    if (metadata) {
        let match;
        match = annotationsRegex.exec(metadata);
        match?.forEach((found) => {
            annotationsFound.add(found);
        });

        // Add corresponding dependencies based on found annotations
        annotationsFound.forEach((annotation) => {
            const rule = annotationReuseLibs[version]?.find((rule) => rule.annotation === annotation);
            if (rule) {
                reuseLibs.push(rule.reuseLib);
            }
        });
    }

    return Array.from(reuseLibs);
}
