import type * as ManifestNamespace from './webapp/manifest';

export type Manifest = ManifestNamespace.SAPJSONSchemaForWebApplicationManifestFile;
export { ManifestNamespace };
export * from './constants';
export * from './cap';
export * from './package';
export * from './vscode';
