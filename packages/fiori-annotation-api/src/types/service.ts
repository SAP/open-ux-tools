import type { AnnotationFile, MetadataElement, ODataVersionType } from '@sap-ux/odata-annotation-core-types';

import type { TextFile } from './text-file';

/**
 * CAP CDS service. All source files are available to the developer, but not all can be modified e.g @sap/cds/common.
 */
export interface CDSService {
    type: 'cap-cds';
    serviceFiles: TextFile[];
    serviceName: string;
}

/**
 * Used when service metadata is provided only in read only mode via `metadataFile`
 * and modifications can only be done locally.
 */
export interface LocalEDMXService {
    type: 'local-edmx';
    odataVersion: ODataVersionType;
    metadataFile: TextFile;
    annotationFiles: TextFile[];
}

export type Service = CDSService | LocalEDMXService;

export interface CompiledService {
    odataVersion: ODataVersionType;
    metadata: MetadataElement[];
    annotationFiles: AnnotationFile[];
}
