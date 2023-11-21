import type * as ManifestNamespace from '@ui5/manifest/types/manifest';

export { ManifestNamespace };
export type Manifest = ManifestNamespace.SAPJSONSchemaForWebApplicationManifestFile;

// Copied from @sap/ux-specification-types //TODO replace when module available
export const enum ManifestSection {
    ui = 'sap.ui',
    app = 'sap.app',
    generic = 'sap.ui.generic.app',
    ovp = 'sap.ovp',
    ui5 = 'sap.ui5'
}
