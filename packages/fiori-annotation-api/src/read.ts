import type { AnnotationList, ConvertedMetadata, RawMetadata } from '@sap-ux/vocabularies-types';
import { convert } from '@sap-ux/annotation-converter';

import { MetadataService } from '@sap-ux/odata-metadata';

import type { CompiledService, Service } from './services';
import { readXmlAnnotations } from './xml';
import { convertMetadataToAvtSchema, convertAnnotationFile } from './avt';

/**
 * Reads annotations for a specific service in an application.
 *
 * @param service
 * @returns
 */
export function readAnnotations(service: Service): ConvertedMetadata {
    const compiledService = compileService(service);

    const metadataService = new MetadataService();
    metadataService.import(compiledService.metadata);

    const rawMetadata: RawMetadata = {
        version: '2.0',
        identification: 'metadataFile',
        schema: convertMetadataToAvtSchema(metadataService),
        references: []
    };

    const annotationIds = new Set<string>();

    // Merge
    for (const annotationFile of [...compiledService.annotationFiles].reverse()) {
        const targets = convertAnnotationFile(annotationFile);
        const convertedTargets: AnnotationList[] = [];
        for (const target of targets) {
            const convertedTarget: AnnotationList = {
                target: target.target,
                annotations: []
            };
            for (const annotation of target.annotations) {
                const qualifier = annotation.qualifier ? '#' + annotation.qualifier : '';
                const id = `${target.target}@${annotation.term}${qualifier}`;
                if (!annotationIds.has(id)) {
                    annotationIds.add(id);
                    convertedTarget.annotations.push(annotation);
                }
            }
            if (convertedTarget.annotations.length) {
                convertedTargets.push(convertedTarget);
            }
        }
        rawMetadata.schema.annotations[annotationFile.uri] = convertedTargets;
    }

    return convert(rawMetadata);
}

function compileService(service: Service): CompiledService {
    if (service.type === 'local') {
        return readXmlAnnotations(service);
    } else {
        throw new Error(`Unsupported service type "${service.type}"!`);
    }
}
