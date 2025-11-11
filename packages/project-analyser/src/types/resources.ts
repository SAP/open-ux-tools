import type { Manifest } from '@sap-ux/project-access';

export interface ManifestDocument {
    readonly path: string;
    readonly content: Manifest;
}

export interface AnnotationDocument {
    readonly path: string;
    readonly format: 'xml' | 'json' | 'cds';
    readonly content: string;
}
