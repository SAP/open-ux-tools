import type { AnnotationFile } from '@sap-ux/odata-annotation-core-types';
import type { MetadataElement } from '@sap-ux/odata-metadata';

export interface CapService {
    type: 'CAP';
    serviceFiles: TextFile[];
}

export interface LocalService {
    type: 'local';
    metadataFile: TextFile;
    annotationFiles: TextFile[];
}

export interface TextFile {
    /**
     * Absolute uri to the file
     */
    uri: string;
    /**
     * Text content of the file
     */
    content: string;
    /**
     * Some of the files in project can not be written to. For example generated files should not be modified and such files will have this flag set to true.
     * If it's not set or the value is false, then the file can be modified.
     */
    isReadOnly?: boolean;
}

export type Service = CapService | LocalService;

export interface CompiledService {
    metadata: MetadataElement[];
    annotationFiles: AnnotationFile[];
}
