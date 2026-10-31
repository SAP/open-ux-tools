import { readUi5Config, isCFEnvironment, getMergedManifest } from '@sap-ux/adp-tooling';
import type { AbapTarget } from '@sap-ux/system-access';
import { createAbapServiceProvider } from '@sap-ux/system-access';
import type { AbapServiceProvider } from '@sap-ux/axios-extension';
import type { Manifest, ManifestNamespace } from '@sap-ux/project-access';

import { formatXml, logger, persistMetadata } from '../utils/index.js';
import type { PersistedMetadata } from '../utils/index.js';
import type { ReadODataMetadataInput, ReadODataMetadataOutput } from '../types/index.js';

type Ui5Model = ManifestNamespace.Model & Record<string, unknown>;

/** A single OData data source entry with its id, URL, bound model, and inline/file-referenced metadata or a per-service error. */
export type ODataMetadataEntry = {
    id: string;
    url: string;
    model?: Ui5Model;
} & (PersistedMetadata | { error: string });

/**
 * Resolves the target ABAP system from `ui5.yaml` and returns a service provider for it.
 * Only meaningful for ABAP (on-premise / S/4) adaptation projects — CF projects have no
 * ABAP backend and never reach this.
 *
 * @param appPath - Adaptation project root.
 * @returns ABAP service provider for the configured target.
 */
async function getAbapProvider(appPath: string): Promise<AbapServiceProvider> {
    const ui5Config = await readUi5Config(appPath, 'ui5.yaml');
    const target = ui5Config.findCustomMiddleware<{ adp?: { target?: Partial<{ url: string; client: string }> } }>(
        'fiori-tools-preview'
    )?.configuration?.adp?.target;
    const abapTarget: AbapTarget = { url: target?.url ?? '', client: target?.client ?? '' };
    return createAbapServiceProvider(abapTarget, { ignoreCertErrors: false }, false, logger);
}

/**
 * Resolves the OData data sources from a merged app descriptor and returns one entry per source,
 * each resolved to its metadata by `resolveMetadata`.
 *
 * @param manifest Merged app descriptor.
 * @param resolveMetadata Produces the metadata portion of an entry for a given data-source URI.
 * @returns One entry per OData data source: id, service URL, bound model, and its resolved metadata.
 */
async function buildEntries(
    manifest: Manifest,
    resolveMetadata: (uri: string) => Promise<PersistedMetadata | { error: string }>
): Promise<ODataMetadataEntry[]> {
    const modelsByDataSource = getModelsByDataSource(manifest);
    const dataSources = manifest['sap.app']?.dataSources ?? {};
    return Promise.all(
        Object.entries(dataSources)
            .filter(([, dataSource]) => dataSource.type === 'OData')
            .map(async ([name, dataSource]) => ({
                id: name,
                url: dataSource.uri,
                model: modelsByDataSource.get(name),
                ...(await resolveMetadata(dataSource.uri))
            }))
    );
}

/**
 * Resolves OData data sources from the merged app descriptor and returns their EDMX metadata.
 *
 * - ABAP (on-premise / S/4) projects: each data source's EDMX is fetched from the connected
 *   ABAP system and persisted under `.context` keyed by the service URI — small services inline,
 *   large ones spilled to a file (`{ metadataFile, sizeBytes }`). A per-service fetch failure
 *   becomes a `{ error }` entry without failing the others.
 * - Cloud Foundry (CF) projects: there is no ABAP backend to proxy `$metadata`, so each data
 *   source is listed with an empty `metadata` string and nothing is written to disk. Callers
 *   needing the bound entity type for a CF project should rely on the editor's runtime model context.
 *
 * @param params Input parameters including `appPath`.
 * @returns One entry per OData data source: id, service URL, bound model, and inline/file-referenced metadata or a per-service error.
 */
export async function readODataMetadataAdp(params: ReadODataMetadataInput): Promise<ReadODataMetadataOutput> {
    const { appPath } = params;
    const manifest = await getMergedManifest(appPath);

    if (await isCFEnvironment(appPath)) {
        return { entries: await buildEntries(manifest, async () => ({ metadata: '' })) };
    }

    const abapProvider = await getAbapProvider(appPath);
    const entries = await buildEntries(manifest, async (uri) => {
        try {
            const rawMetadata = await abapProvider.service(uri).metadata();
            return persistMetadata(appPath, uri, formatXml(rawMetadata));
        } catch (error) {
            return { error: error instanceof Error ? error.message : String(error) };
        }
    });
    return { entries };
}

/**
 * Builds a lookup from data source name to the UI5 model bound to it, from the manifest's
 * `sap.ui5.models`.
 *
 * @param manifest Merged app descriptor's manifest.
 * @returns Map of data source name to its bound UI5 model.
 */
function getModelsByDataSource(manifest: Manifest): Map<string, Ui5Model> {
    const modelsByDataSource = new Map<string, Ui5Model>();
    for (const model of Object.values(manifest['sap.ui5']?.models ?? {})) {
        if (typeof model.dataSource === 'string' && model.dataSource) {
            modelsByDataSource.set(model.dataSource, { ...model });
        }
    }
    return modelsByDataSource;
}
