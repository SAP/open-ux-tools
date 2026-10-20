import { readUi5Config, getVariant, ManifestService, ManifestServiceCF, isCFEnvironment } from '@sap-ux/adp-tooling';
import type { IManifestService } from '@sap-ux/adp-tooling';
import type { AbapTarget } from '@sap-ux/system-access';
import { createAbapServiceProvider } from '@sap-ux/system-access';
import type { AbapServiceProvider } from '@sap-ux/axios-extension';

import { formatXml, logger, writeContextMetadata } from '../utils/index.js';
import type { ReadODataMetadataInput, ReadODataMetadataOutput } from '../types/index.js';

type Ui5Model = { dataSource?: string } & Record<string, unknown>;

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
async function getProvider(appPath: string): Promise<AbapServiceProvider> {
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
 * `$metadata` request, so the EDMX cannot be fetched (see {@link ManifestServiceCF}). In that
 * case the data sources are still listed from the locally-built manifest (`dist/manifest.json`)
 * with an empty `metadata` string, and nothing is written to disk. Callers needing the bound
 * entity type for a CF project should rely on the editor's runtime model context instead.
 *
 * @param params Input parameters including `appPath` and the optional `saveLocal` flag.
 * @returns One entry per OData data source: id, service URL, formatted metadata XML, and bound model.
 */
export async function readODataMetadataAdp(params: ReadODataMetadataInput): Promise<ReadODataMetadataOutput> {
    const { appPath, saveLocal = false } = params;

    if (await isCFEnvironment(appPath)) {
        return readCfODataDataSources(appPath);
    }
    return readAbapODataMetadata(appPath, saveLocal);
}

/**
 * Lists the OData data sources of a Cloud Foundry adaptation project from its locally-built
 * manifest (`dist/manifest.json`). EDMX metadata is not available for CF projects, so each
 * entry carries an empty `metadata` string and nothing is written to disk.
 *
 * @param appPath Adaptation project root.
 * @returns One entry per OData data source: id, service URL, empty metadata, and bound model.
 */
async function readCfODataDataSources(appPath: string): Promise<ReadODataMetadataOutput> {
    const manifestService = await ManifestServiceCF.init(appPath, logger);
    const modelsByDataSource = getModelsByDataSource(manifestService);
    const dataSources = manifestService.getManifestDataSources();

    const entries: ODataMetadataEntry[] = Object.entries(dataSources)
        .filter(([, dataSource]) => dataSource.type === 'OData')
        .map(([name, dataSource]) => ({
            id: name,
            url: dataSource.uri,
            metadata: '',
            model: modelsByDataSource.get(name)
        }));
    return { entries };
}

/**
 * Resolves OData data sources from the merged app descriptor and fetches their EDMX metadata
 * from the connected ABAP system. Optionally persists each result as a local XML file.
 *
 * @param appPath Adaptation project root.
 * @param saveLocal Whether to persist each result under `webapp/.context`.
 * @returns One entry per OData data source: id, service URL, formatted metadata XML, and bound model.
 */
async function readAbapODataMetadata(appPath: string, saveLocal: boolean): Promise<ReadODataMetadataOutput> {
    const abapProvider = await getProvider(appPath);
    const variant = await getVariant(appPath);
    const manifestService = await ManifestService.initMergedManifest(abapProvider, appPath, variant, logger);

    const modelsByDataSource = getModelsByDataSource(manifestService);
    const dataSources = manifestService.getManifestDataSources();
    const entries: ODataMetadataEntry[] = await Promise.all(
        Object.entries(dataSources)
            .filter(([, dataSource]) => dataSource.type === 'OData')
            .map(async ([name, dataSource]) => {
                const rawMetadata = await abapProvider.service(dataSource.uri).metadata();
                const formattedMetadata = formatXml(rawMetadata);
                if (saveLocal) {
                    writeContextMetadata(appPath, name, formattedMetadata);
                }
                return {
                    id: name,
                    url: dataSource.uri,
                    metadata: formattedMetadata,
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
 * @param manifestService Initialized manifest service (ABAP or CF).
 * @returns Map of data source name to its bound UI5 model.
 */
function getModelsByDataSource(manifestService: IManifestService): Map<string, Ui5Model> {
    const manifest = manifestService.getManifest();
    const ui5Models = (manifest['sap.ui5']?.models ?? {}) as Record<string, Ui5Model>;
    return new Map(
        Object.values(ui5Models)
            .filter((model): model is Ui5Model & { dataSource: string } => Boolean(model.dataSource))
            .map((model) => [model.dataSource, model])
    );
}