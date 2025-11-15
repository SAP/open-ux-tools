import type { SAPJSONSchemaForWebApplicationManifestFile as Manifest } from '@ui5/manifest/types/manifest';

export interface ManifestDocument {
    readonly path: string;
    readonly content: Manifest;
}

export interface AnnotationDocument {
    readonly path: string;
    readonly format: 'xml' | 'json' | 'cds';
    readonly content: string;
}
