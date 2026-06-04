// `@ui5/manifest` only ships `types/manifest.d.ts` and has no `exports`/`main`/`types` field,
// so under NodeNext we deep-import it. The `.js` extension is required by NodeNext
// for relative-style subpath imports — TS maps it to the sibling `.d.ts` at type-check time.
import type * as ManifestNamespace from '@ui5/manifest/types/manifest.js';

export type { ManifestNamespace };
export type Manifest = ManifestNamespace.SAPJSONSchemaForWebApplicationManifestFile;

export interface AnnotationFile {
    dataSourceUri: string;
    fileContent: string;
}
