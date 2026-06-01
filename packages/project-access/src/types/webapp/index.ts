// Re-export the entire namespace for backwards compatibility
export type * as ManifestNamespace from '@ui5/manifest';

// Re-export commonly used types
export type { SAPJSONSchemaForWebApplicationManifestFile as Manifest } from '@ui5/manifest';

export interface AnnotationFile {
    dataSourceUri: string;
    fileContent: string;
}
