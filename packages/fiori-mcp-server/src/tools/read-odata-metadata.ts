import * as path from 'node:path';
import * as fs from 'node:fs';

import { getVariant, ManifestService } from '@sap-ux/adp-tooling';
import prettifyXml from 'prettify-xml';

import { getProvider, logger } from './services/abap-context.js';
import type { AdpMetadataInput } from '../types/index.js';

type Ui5Model = { dataSource?: string } & Record<string, unknown>;

export type ODataMetadataEntry = {
    id: string;
    url: string;
    metadata: string;
    model?: Ui5Model;
};

export async function readODataMetadataAdp(params: AdpMetadataInput): Promise<ODataMetadataEntry[]> {
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
            await writeLocalMetadata(appPath, name, formattedMetadata);
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

async function writeLocalMetadata(appPath: string, name: string, metadata: string): Promise<void> {
    const metadataPath = path.join(appPath, 'webapp', '.context', `${name}-metadata.xml`);
    await fs.promises.mkdir(path.dirname(metadataPath), { recursive: true });
    await fs.promises.writeFile(metadataPath, metadata, 'utf-8');
}

function formatXml(xml: string): string {
    try {
        return prettifyXml(xml, { indent: 4 });
    } catch (error) {
        logger.warn(`Failed to format XML: ${(error as Error).message}`);
        return xml;
    }
}
