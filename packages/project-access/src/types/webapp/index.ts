import type * as ManifestNamespace from '@ui5/manifest/types/manifest';

export { ManifestNamespace };
export type Manifest = ManifestNamespace.SAPJSONSchemaForWebApplicationManifestFile;

export interface AnnotationFile {
    dataSourceUri: string;
    fileContent: string;
}
