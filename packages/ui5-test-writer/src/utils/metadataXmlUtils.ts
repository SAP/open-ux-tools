import { join } from 'node:path';
import type { Editor } from 'mem-fs-editor';
import type { Manifest } from '@sap-ux/project-access';
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

/**
 * Reads the local annotation files of the manifest's main OData service, in manifest order.
 *
 * @param manifest The application manifest
 * @param webappPath Absolute path to the app's webapp folder
 * @param fs Optional mem-fs editor instance used to read the files
 * @returns The annotation XML contents; missing/unreadable files are skipped
 */
export function readAnnotationXmls(manifest: Manifest | undefined, webappPath: string, fs?: Editor): string[] {
    const dataSources = manifest?.['sap.app']?.dataSources;
    const mainServiceName = manifest?.['sap.ui5']?.models?.['']?.dataSource;
    const mainService = mainServiceName ? dataSources?.[mainServiceName] : undefined;
    const annotationNames = mainService?.settings?.annotations ?? [];
    const xmls: string[] = [];
    for (const annotationName of annotationNames) {
        const localUri = dataSources?.[annotationName]?.settings?.localUri;
        const annotationPath = localUri ? join(webappPath, localUri) : undefined;
        const xml = annotationPath && fs?.exists(annotationPath) ? fs.read(annotationPath) : undefined;
        if (xml) {
            xmls.push(xml);
        }
    }
    return xmls;
}
