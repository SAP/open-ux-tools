import { join, dirname } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';

import { readUi5Config, getVariant, ManifestService } from '@sap-ux/adp-tooling';
import type { AbapTarget } from '@sap-ux/system-access';
import { createAbapServiceProvider } from '@sap-ux/system-access';
import type { AbapServiceProvider } from '@sap-ux/axios-extension';
import prettifyXml from 'prettify-xml';

import { logger } from '../utils/index.js';
import type { ReadODataMetadataInput } from '../types/index.js';

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
    const target = ui5Config.findCustomMiddleware<{ adp?: { target?: Partial<{ url: string; client: string }> } }>('fiori-tools-preview')
        ?.configuration?.adp?.target;
    const abapTarget: AbapTarget = { url: target?.url ?? '', client: target?.client ?? '' };
    return createAbapServiceProvider(abapTarget, { ignoreCertErrors: false }, false, logger);
}

/**
 * Resolves OData data sources from the merged app descriptor and fetches their EDMX metadata
 * from the connected ABAP system. Optionally persists each result as a local XML file for
 * agent context consumption.
 *
 * @param params Input parameters including `appPath` and the optional `saveLocal` flag.
 * @returns One entry per OData data source: id, service URL, formatted metadata XML, and bound model.
 */
export async function readODataMetadataAdp(params: ReadODataMetadataInput): Promise<ODataMetadataEntry[]> {
    const { appPath, saveLocal = false } = params;
    const abapProvider = await getProvider(appPath);
    const variant = await getVariant(appPath);
    const manifestService = await ManifestService.initMergedManifest(abapProvider, appPath, variant, logger);

    const manifest = manifestService.getManifest();
    const ui5Models = (manifest['sap.ui5']?.models ?? {}) as Record<string, Ui5Model>;
    const modelsByDataSource = new Map(
        Object.values(ui5Models)
            .filter((model): model is Ui5Model & { dataSource: string } => Boolean(model.dataSource))
            .map((model) => [model.dataSource, model])
    );

    const dataSources = manifestService.getManifestDataSources();
    const entries: ODataMetadataEntry[] = [];
    for (const [name, dataSource] of Object.entries(dataSources)) {
        if (dataSource.type !== 'OData') {
            continue;
        }
        const rawMetadata = await abapProvider.service(dataSource.uri).metadata();
        const formattedMetadata = formatXml(rawMetadata);
        if (saveLocal) {
            writeLocalMetadata(appPath, name, formattedMetadata);
        }
        entries.push({
            id: name,
            url: dataSource.uri,
            metadata: formattedMetadata,
            model: modelsByDataSource.get(name)
        });
    }
    return entries;
}

/**
 * Writes formatted OData metadata to `webapp/.context/<name>-metadata.xml` so agents can read
 * it as context without fetching from the ABAP system on every invocation.
 *
 * @param appPath Adaptation project root directory.
 * @param name Data source name; used as the file basename.
 * @param metadata Formatted XML content to persist.
 */
function writeLocalMetadata(appPath: string, name: string, metadata: string): void {
    const metadataPath = join(appPath, 'webapp', '.context', `${name}-metadata.xml`);
    mkdirSync(dirname(metadataPath), { recursive: true });
    writeFileSync(metadataPath, metadata, 'utf-8');
}

/**
 * Pretty-prints an XML string using `prettify-xml`.
 *
 * @param xml Raw XML content.
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
