import prettifyXml from 'prettify-xml';
import type { MergedAppDescriptor } from '@sap-ux/axios-extension';
import { getMergedManifest } from '../../get-merged-manifest.js';
import { logger, metadataFileName, writeContextFile, getProvider } from './system-resources.js';

// `Manifest` is not re-exported from the package entry, so reference it through the exported descriptor.
type Manifest = MergedAppDescriptor['manifest'];

type Ui5Model = { dataSource?: string } & Record<string, unknown>;

type ManifestDataSource = { type?: string; uri: string } & Record<string, unknown>;

export type ODataMetadataEntry = {
    id: string;
    url: string;
    metadata: string;
    model?: Ui5Model;
};

/**
 * Narrows an unknown UI5 model entry to one bound to a data source.
 *
 * @param model - Candidate model entry from the merged manifest's `sap.ui5.models`.
 * @returns True when `model` is an object carrying a string `dataSource`.
 */
function isModelWithDataSource(model: unknown): model is Ui5Model & { dataSource: string } {
    return typeof model === 'object' && model !== null && typeof (model as Ui5Model).dataSource === 'string';
}

/**
 * Reads the merged app descriptor for the adaptation project by delegating to
 * {@link getMergedManifest}, which re-runs the `@ui5/task-adaptation` pipeline
 * in-process against the cached base app.
 *
 * @param appPath - Adaptation project root.
 * @returns The merged descriptor wrapping the resolved `manifest`.
 */
export async function readMergedManifest(appPath: string): Promise<{ manifest: Manifest }> {
    // getMergedManifest is typed as `object` (its pipeline is dynamically imported); the pipeline
    // resolves to the merged manifest, which we only ever read as `.manifest` downstream.
    const manifest = (await getMergedManifest({ appPath })) as Manifest;
    return { manifest };
}

/** Reads the merged manifest for an adaptation project. Injectable for testing. */
export type MergedManifestReader = (appPath: string) => Promise<{ manifest: Manifest }>;

/**
 * Resolves OData data sources from the merged manifest and fetches their metadata in parallel.
 *
 * @param appPath - Adaptation project root.
 * @param saveLocal - Whether to persist each fetched metadata document as
 *   `webapp/.context/<dataSource>-metadata.xml` for agent context.
 * @param readManifest - Reader used to obtain the merged manifest. Defaults to
 *   {@link readMergedManifest}; overridable in tests to avoid the `@ui5/task-adaptation` pipeline.
 * @returns OData data source entries with id, url, metadata, and the bound model (if any).
 */
export async function readODataMetadataFromManifest(
    appPath: string,
    saveLocal: boolean = false,
    readManifest: MergedManifestReader = readMergedManifest
): Promise<ODataMetadataEntry[]> {
    const mergedManifest = await readManifest(appPath);
    const serviceProvider = await getProvider(appPath);
    const ui5Models = mergedManifest.manifest['sap.ui5']?.models ?? {};
    const modelsByDataSource = new Map(
        Object.values(ui5Models)
            .filter(isModelWithDataSource)
            .map((model) => [model.dataSource, model])
    );

    // Manifest's index signature types dataSource entries as `unknown`; narrow to the two fields
    // we read here. The subsequent `type === 'OData'` filter guards the shape we depend on.
    const dataSources = (mergedManifest.manifest['sap.app'].dataSources ?? {}) as Record<string, ManifestDataSource>;
    const odataSources = Object.entries(dataSources).filter(([, ds]) => ds.type === 'OData');

    return Promise.all(
        odataSources.map(async ([name, dataSource]) => {
            const rawMetadata = await serviceProvider.service(dataSource.uri).metadata();
            const formattedMetadata = formatXml(rawMetadata);
            if (saveLocal) {
                await writeContextFile(appPath, metadataFileName(name), formattedMetadata);
            }
            return {
                id: name,
                url: dataSource.uri,
                metadata: formattedMetadata,
                model: modelsByDataSource.get(name)
            };
        })
    );
}

/**
 * Pretty-prints an XML string.
 *
 * @param xml - Raw XML content.
 * @returns Indented XML; returns the input unchanged if formatting fails.
 */
function formatXml(xml: string): string {
    try {
        return prettifyXml(xml, { indent: 4 });
    } catch (error) {
        logger.warn(`Failed to format XML: ${(error as Error).message}`);
        return xml;
    }
}
