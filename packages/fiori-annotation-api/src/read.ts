import type { ConvertedMetadata, RawMetadata } from '@sap-ux/vocabularies-types';
import { convert } from '@sap-ux/annotation-converter';

import type { Project } from './project';

export interface CapService {
    type: 'CAP';
    serviceFiles: File[];
}

export interface LocalService {
    type: 'local';
    metadataFile: File;
    annotationFiles: File[];
}

export interface File {
    /**
     * Absolute uri to the file
     */
    uri: string;
    content: string;
}

export type Service = CapService | LocalService;

/**
 * Reads annotations for a specific service in an application.
 *
 * @param service
 * @returns
 */
export function readAnnotations(service: Service): ConvertedMetadata {
    const rawMetadata: RawMetadata = {
        version: '2.0',
        identification: 'metadataFile',
        schema: {
            actions: [],
            annotations: {},
            associationSets: [],
            associations: [],
            complexTypes: [],
            entityContainer: {
                _type: 'EntityContainer',
                fullyQualifiedName: ''
            },
            entitySets: [],
            entityTypes: [],
            namespace: '',
            singletons: [],
            typeDefinitions: []
        },
        references: []
    };

    // const application = project.apps[applicationName];

    // if (!application) {
    //     throw new Error(`Application "${applicationName}" not found in the project.`); // TODO: translate?
    // }

    // const service = application.services[serviceName];
    // if (!service) {
    //     throw new Error(`Service "${serviceName}" not found in the project.`); // TODO: translate?
    // }

    // service.

    return convert(rawMetadata);
}

function loadService(service: Service) {
    if (service.type === 'local') {
    } else if (service.type === 'CAP') {
    }
    throw new Error(`Unknown service type '${service.type}'`);
}
