import { readUi5Config, isCFEnvironment, getMergedManifest } from '@sap-ux/adp-tooling';
import type { AbapTarget } from '@sap-ux/system-access';
import { createAbapServiceProvider } from '@sap-ux/system-access';
import type { AbapServiceProvider } from '@sap-ux/axios-extension';
import type { Manifest, ManifestNamespace } from '@sap-ux/project-access';

import { formatXml, logger, writeContextMetadata } from '../utils/index.js';
import type { ReadODataMetadataInput, ReadODataMetadataOutput } from '../types/index.js';

type Ui5Model = ManifestNamespace.Model & Record<string, unknown>;

/** A single OData data source entry with its merged manifest metadata, URL, and bound model. */
export type ODataMetadataEntry = {
    id: string;
    url: string;
    metadata: string;
    model?: Ui5Model;
};

/**
 * Resolves the target system from `ui5.yaml` and returns an ABAP service provider for it.
 *
 * @param appPath - Adaptation project root.
 * @returns ABAP service provider for the configured target.
 */
async function getProvider(appPath: string): Promise<AbapServiceProvider | undefined> {
    if (await isCFEnvironment(appPath)) {
        return undefined;
    }
    const ui5Config = await readUi5Config(appPath, 'ui5.yaml');
    const target = ui5Config.findCustomMiddleware<{ adp?: { target?: Partial<{ url: string; client: string }> } }>(
        'fiori-tools-preview'
    )?.configuration?.adp?.target;
    const abapTarget: AbapTarget = { url: target?.url ?? '', client: target?.client ?? '' };
    return createAbapServiceProvider(abapTarget, { ignoreCertErrors: false }, false, logger);
}

/**
 * Resolves OData data sources from the merged app descriptor and fetches their EDMX metadata
 * from the connected ABAP system. Optionally persists each result as a local XML file for
 * agent context consumption.
 *
 * For Cloud Foundry (CF) adaptation projects there is no ABAP service provider to proxy the
 * `$metadata` request, so the EDMX cannot be fetched. In that
 * case the data sources are still listed from the merged manifest built by `getMergedManifest`
 * with an empty `metadata` string, and nothing is written to disk. Callers needing the bound
 * entity type for a CF project should rely on the editor's runtime model context instead.
 *
 * @param params Input parameters including `appPath` and the optional `saveLocal` flag.
 * @returns One entry per OData data source: id, service URL, formatted metadata XML, and bound model.
 */
export async function readODataMetadataAdp(params: ReadODataMetadataInput): Promise<ReadODataMetadataOutput> {
    const { appPath, saveLocal = false } = params;

    const abapProvider = await getProvider(appPath);
    const manifest = await getMergedManifest(appPath);
    return readODataMetadata(manifest, appPath, saveLocal, abapProvider);
}

/**
 * Resolves OData data sources from the merged app descriptor and fetches their EDMX metadata
 * when an ABAP provider is available. Optionally persists fetched metadata as a local XML file.
 *
 * @param manifest Merged app descriptor.
 * @param appPath Adaptation project root.
 * @param saveLocal Whether to persist each result under `webapp/.context`.
 * @param abapProvider ABAP service provider; omitted for CF projects, which return empty metadata.
 * @returns One entry per OData data source: id, service URL, formatted metadata XML, and bound model.
 */
async function readODataMetadata(
    manifest: Manifest,
    appPath: string,
    saveLocal: boolean,
    abapProvider?: AbapServiceProvider
): Promise<ReadODataMetadataOutput> {
    const modelsByDataSource = getModelsByDataSource(manifest);
    const dataSources = manifest['sap.app']?.dataSources ?? {};
    const entries: ODataMetadataEntry[] = await Promise.all(
        Object.entries(dataSources)
            .filter(([, dataSource]) => dataSource.type === 'OData')
            .map(async ([name, dataSource]) => {
                let metadata = '';
                if (abapProvider) {
                    const rawMetadata = await abapProvider.service(dataSource.uri).metadata();
                    metadata = formatXml(rawMetadata);
                    if (saveLocal) {
                        writeContextMetadata(appPath, name, metadata);
                    }
                }
                return {
                    id: name,
                    url: dataSource.uri,
                    metadata,
                    model: modelsByDataSource.get(name)
                };
            })
    );
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
