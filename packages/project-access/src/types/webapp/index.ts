import type * as _ManifestNamespace from '@ui5/manifest';

// Re-export the entire namespace for backwards compatibility
export { _ManifestNamespace as ManifestNamespace };

// Re-export commonly used types
export type Manifest = _ManifestNamespace.SAPJSONSchemaForWebApplicationManifestFile;

export interface AnnotationFile {
    dataSourceUri: string;
    fileContent: string;
}
