import * as path from 'node:path';
import * as fs from 'node:fs';
import ZipFile from 'adm-zip';
import prettifyXml from 'prettify-xml';

import { ToolsLogger } from '@sap-ux/logger';
import { readUi5Config } from '@sap-ux/adp-tooling';
import type { AbapTarget } from '@sap-ux/system-access';
import { createAbapServiceProvider } from '@sap-ux/system-access';
import { ODataVersion } from '@sap-ux/axios-extension';
import type { ODataServiceInfo, AbapServiceProvider, MergedAppDescriptor } from '@sap-ux/axios-extension';

export type systemPath = {
    url: string;
    client: string;
};

type UI5AppFilter = {
    fields: string;
    readonly ['sap.ui/technology']?: 'UI5';
    readonly ['sap.app/type']: 'application' | 'library';
} & Record<string, string>;

type AppDescrVariant = { 'id': string } & Record<string, unknown>;

type Ui5Model = { dataSource?: string } & Record<string, unknown>;

type ODataMetadataEntry = {
    id: string;
    url: string;
    metadata: string;
    model?: Ui5Model;
};

const LIBRARY_WITH_DESCR_FILTER: UI5AppFilter = {
    fields: ['sap.app/id', 'sap.app/title', 'url', 'repoName'].join(','),
    'sap.ui/technology': 'UI5',
    'sap.app/type': 'library',
    'fileType': 'appdescr'
};

const logger = new ToolsLogger({ logPrefix: 'fiori-mcp-server' });

/**
 * Zips the webapp folder and merges it with the base app descriptor on the LREP backend.
 *
 * @param appPath - Adaptation project root.
 * @returns The merged descriptor for the variant's `id`.
 */
export async function readMergedManifest(appPath: string): Promise<MergedAppDescriptor> {
    const provider = await getProvider(appPath);
    const lrepService = provider.getLayeredRepository();
    await lrepService.getCsrfToken();

    const manifest = await readManifest(appPath);

    const zip = new ZipFile();
    zip.addLocalFolder(path.join(appPath, 'webapp'));

    const merged = await lrepService.mergeAppDescriptorVariant(zip.toBuffer(), '//');
    return merged[manifest.id];
}

/**
 * Resolves OData data sources from the merged manifest and fetches their metadata.
 *
 * @param appPath - Adaptation project root.
 * @param saveLocal - Whether to save fetched metadata locally in the project for agent context.
 * @returns OData data source entries with id, url, metadata, and the bound model (if any).
 */
export async function readAnnotationfromManifest(
    appPath: string,
    saveLocal: boolean = false
): Promise<ODataMetadataEntry[]> {
    const abapProvider = await getProvider(appPath);
    const mergedManifest = await readMergedManifest(appPath);

    const ui5Models = (mergedManifest.manifest['sap.ui5']?.models ?? {}) as Record<string, Ui5Model>;
    const modelsByDataSource = new Map(
        Object.values(ui5Models)
            .filter((model): model is Ui5Model & { dataSource: string } => Boolean(model.dataSource))
            .map((model) => [model.dataSource, model])
    );

    const dataSources = mergedManifest.manifest['sap.app'].dataSources ?? {};
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

/**
 * Queries the system's app index for UI5 libraries with an `appdescr` file.
 *
 * @param appPath - Adaptation project root.
 * @returns Flattened library entries returned by the app index.
 */
export async function getAvailableLibraryFromSystem(appPath: string): Promise<Array<object>> {
    const provider = await getProvider(appPath);
    const appIndex = await provider.getAppIndex();
    const response = await appIndex.search(LIBRARY_WITH_DESCR_FILTER);
    return response.flat();
}

/**
 * Lists OData V2 and V4 services available in the target system's catalog.
 *
 * @param appPath - Adaptation project root.
 * @param filter - Filter string to match service names.
 * @returns Combined service catalog entries from the V2 and V4 catalogs.
 */
export async function getAvailableODataServices(appPath: string, filter: string): Promise<Array<ODataServiceInfo>> {
    const abapProvider = await getProvider(appPath);

    const [serviceCatalogV2, serviceCatalogV4] = await Promise.all([
        abapProvider.catalog(ODataVersion.v2),
        abapProvider.catalog(ODataVersion.v4)
    ]);

    serviceCatalogV2.isS4Cloud = Promise.resolve(true);
    serviceCatalogV4.isS4Cloud = Promise.resolve(true);

    const [v2Services, v4Services] = await Promise.all([
        serviceCatalogV2.listServices(),
        serviceCatalogV4.listServices()
    ]);

    const needle = filter.toUpperCase();
    return [...v2Services, ...v4Services].filter((service) => service.name.includes(needle));
}

/**
 * Resolves the target system from `ui5.yaml` and returns an ABAP service provider for it.
 *
 * @param appPath - Adaptation project root.
 * @returns ABAP service provider for the configured target.
 */
async function getProvider(appPath: string): Promise<AbapServiceProvider> {
    const system = await getSystemUrl(appPath);
    const target: AbapTarget = { url: system.url, client: system.client };
    return createAbapServiceProvider(target, { ignoreCertErrors: false }, false, logger);
}

/**
 * Reads the preview middleware target from `ui5.yaml`.
 *
 * @param appPath - Adaptation project root.
 * @returns System URL and client; empty strings when unconfigured.
 */
async function getSystemUrl(appPath: string): Promise<systemPath> {
    const ui5Config = await readUi5Config(appPath, 'ui5.yaml');
    const target = ui5Config.findCustomMiddleware<{ adp?: { target?: Partial<systemPath> } }>('fiori-tools-preview')
        ?.configuration?.adp?.target;
    return {
        url: target?.url ?? '',
        client: target?.client ?? ''
    };
}

/**
 * Reads and parses the adaptation project's app descriptor variant.
 *
 * @param appPath - Adaptation project root.
 * @returns Parsed `webapp/manifest.appdescr_variant`.
 */
async function readManifest(appPath: string): Promise<AppDescrVariant> {
    const manifestPath = path.join(appPath, 'webapp', 'manifest.appdescr_variant');
    const fileContents = await fs.promises.readFile(manifestPath, 'utf-8');
    return JSON.parse(fileContents) as AppDescrVariant;
}

/**
 * Writes formatted OData metadata to the project's `webapp/.context` folder for agent consumption.
 *
 * @param appPath - Adaptation project root.
 * @param name - Data source name; used as the file basename.
 * @param metadata - Formatted XML content to persist.
 */
async function writeLocalMetadata(appPath: string, name: string, metadata: string): Promise<void> {
    const metadataPath = path.join(appPath, 'webapp', '.context', `${name}-metadata.xml`);
    await fs.promises.mkdir(path.dirname(metadataPath), { recursive: true });
    await fs.promises.writeFile(metadataPath, metadata, 'utf-8');
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
