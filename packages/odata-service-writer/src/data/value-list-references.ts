import { join } from 'node:path';
import { join as joinPosix } from 'node:path/posix';

import type { Editor } from 'mem-fs-editor';
import prettifyXml from 'prettify-xml';

import type { ConvertedMetadata, RawSchema, StringExpression } from '@sap-ux/vocabularies-types';
import { convert } from '@sap-ux/annotation-converter';
import { parse } from '@sap-ux/edmx-parser';

import { DirName } from '@sap-ux/project-access';

import type { OdataService, ValueListReference, ValueListReferenceService } from '../types';

/**
 * Writes service metadata for value list references to the local service folder.
 *
 * @param webappPath - Webapp path of the UI5 application
 * @param valueListReferences - Value list references to be generated
 * @param service - OData service instance
 * @param fs - Memfs editor instance
 */
export function writeValueListReferenceMetadata(
    webappPath: string,
    valueListReferences: ValueListReferenceService[],
    service: OdataService,
    fs: Editor
): void {
    if (!valueListReferences.length || !service.path) {
        return;
    }
    for (const reference of valueListReferences) {
        const [valueListServicePath] = reference.path.split(';');
        const segments = valueListServicePath.split('/');
        let prefix = '/';
        while (segments.length) {
            const next = joinPosix(prefix, segments.shift()!);
            if (!service.path.startsWith(next)) {
                break;
            }
            prefix = next;
        }
        const relativeServicePath = valueListServicePath.replace(prefix, '');

        const path = join(
            webappPath,
            DirName.LocalService,
            service.name ?? 'mainService',
            relativeServicePath,
            reference.target,
            'metadata.xml'
        );

        if (reference.data) {
            fs.write(path, prettifyXml(reference.data, { indent: 4 }));
        }
    }
}

/**
 * Collects ValueListReferences annotation values from the given metadata and annotation files.
 *
 * @param serviceRootPath - The service path to which the value list references belong
 * @param metadata - The metadata of the service
 * @param annotations - The annotation files
 * @returns ValueListReferences found in the files.
 */
export function getValueListReferences(
    serviceRootPath: string,
    metadata: ConvertedMetadata | RawSchema | string | undefined,
    annotations: { Definitions: string }[]
): ValueListReference[] {
    if (!metadata) {
        return [];
    }
    const files = [metadata, ...annotations.map((annotationFile) => annotationFile.Definitions)];

    const valueListReferences: ValueListReference[] = [];
    for (const data of files) {
        const schema = typeof data === 'string' ? convert(parse(data)) : data;
        for (const annotationLists of Object.values(schema.annotations)) {
            for (const annotationList of annotationLists) {
                const target = annotationList.target.replace(schema.namespace + '.', '');
                for (const annotation of annotationList.annotations) {
                    if (annotation.term === 'com.sap.vocabularies.Common.v1.ValueListReferences') {
                        for (const value of annotation.collection ?? []) {
                            if (value.type === 'String') {
                                const stringValue = value as StringExpression;
                                valueListReferences.push({
                                    serviceRootPath,
                                    target,
                                    value: stringValue.String
                                });
                            }
                        }
                    }
                }
            }
        }
    }
    return valueListReferences;
}
