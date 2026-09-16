import type { ConvertedMetadata } from '@sap-ux/vocabularies-types';
import { parse, merge } from '@sap-ux/edmx-parser';
import { convert } from '@sap-ux/annotation-converter';

/**
 * Converts the service metadata merged with its annotation files into a single converted model.
 * Annotation-only terms (e.g. `Common.IsActionCritical`) only surface once the annotation files are merged in.
 *
 * @param metadataXml The service metadata XML (metadata.xml), or undefined
 * @param annotationXmls Annotation XML documents to merge, in manifest order
 * @returns The merged converted metadata, or undefined if no metadata was provided
 */
export function getMergedConvertedMetadata(
    metadataXml?: string,
    annotationXmls: string[] = []
): ConvertedMetadata | undefined {
    if (!metadataXml) {
        return undefined;
    }
    const parsedDocs = [
        parse(metadataXml),
        ...annotationXmls.map((xml, index) => parse(xml, `annotation${index}.xml`))
    ];
    return convert(parsedDocs.length > 1 ? merge(...parsedDocs) : parsedDocs[0]);
}
