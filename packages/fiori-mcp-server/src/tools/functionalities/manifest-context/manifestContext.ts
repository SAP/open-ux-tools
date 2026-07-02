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

export type SystemPath = {
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

const CONTEXT_DIR = path.join('webapp', '.context');

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
 * Resolves OData data sources from the merged manifest and fetches their metadata in parallel.
 *
 * @param appPath - Adaptation project root.
 * @param saveLocal - Whether to persist each fetched metadata document as
 *   `webapp/.context/<dataSource>-metadata.xml` for agent context.
 * @returns OData data source entries with id, url, metadata, and the bound model (if any).
 */
export async function readODataMetadataFromManifest(
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
    const odataSources = Object.entries(dataSources).filter(([, ds]) => ds.type === 'OData');

    return Promise.all(
        odataSources.map(async ([name, dataSource]) => {
            const rawMetadata = await abapProvider.service(dataSource.uri).metadata();
            const formattedMetadata = formatXml(rawMetadata);
            if (saveLocal) {
                await writeContextFile(appPath, `${name}-metadata.xml`, formattedMetadata);
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
 * @param filter - Case-insensitive substring matched against service names.
 *   Empty string returns every service.
 * @returns Combined service catalog entries from the V2 and V4 catalogs.
 */
export async function getAvailableODataServices(appPath: string, filter: string): Promise<Array<ODataServiceInfo>> {
    const abapProvider = await getProvider(appPath);

    const [serviceCatalogV2, serviceCatalogV4] = await Promise.all([
        abapProvider.catalog(ODataVersion.v2),
        abapProvider.catalog(ODataVersion.v4)
    ]);

    // Skip the on-prem probe inside listServices() — our supported targets are S/4HANA Cloud.
    // Without this the V2/V4 catalog calls issue an extra HEAD request that returns 404 on cloud
    // tenants and adds latency without changing the result.
    serviceCatalogV2.isS4Cloud = Promise.resolve(true);
    serviceCatalogV4.isS4Cloud = Promise.resolve(true);

    const [v2Services, v4Services] = await Promise.all([
        serviceCatalogV2.listServices(),
        serviceCatalogV4.listServices()
    ]);

    const services = [...v2Services, ...v4Services];
    if (!filter) {
        return services;
    }
    const needle = filter.toUpperCase();
    return services.filter((service) => service.name.toUpperCase().includes(needle));
}

/**
 * Serializes text (or serialized JSON) to `webapp/.context/<fileName>` for agent consumption.
 *
 * @param appPath - Adaptation project root.
 * @param fileName - Basename to write under `webapp/.context/` (e.g. `libraries.json`).
 * @param contents - UTF-8 payload to write.
 * @returns Absolute path of the written file.
 */
export async function writeContextFile(appPath: string, fileName: string, contents: string): Promise<string> {
    const filePath = path.join(appPath, CONTEXT_DIR, fileName);
    await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
    await fs.promises.writeFile(filePath, contents, 'utf-8');
    return filePath;
}

/**
 * Resolves the target system from `ui5.yaml` and returns an ABAP service provider for it.
 *
 * @param appPath - Adaptation project root.
 * @returns ABAP service provider for the configured target.
 * @throws {Error} When `ui5.yaml` has no `fiori-tools-preview` middleware with an ADP target URL.
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
 * @returns System URL and client from the `fiori-tools-preview` ADP target configuration.
 * @throws {Error} When the middleware or its ADP target URL is missing.
 */
async function getSystemUrl(appPath: string): Promise<SystemPath> {
    const ui5Config = await readUi5Config(appPath, 'ui5.yaml');
    const target = ui5Config.findCustomMiddleware<{ adp?: { target?: Partial<SystemPath> } }>('fiori-tools-preview')
        ?.configuration?.adp?.target;
    if (!target?.url) {
        throw new Error(
            `No ABAP target configured for ${appPath}. Add a 'fiori-tools-preview' middleware ` +
                `with 'configuration.adp.target.url' (and optional 'client') to ui5.yaml.`
        );
    }
    return {
        url: target.url,
        client: target.client ?? ''
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
