import * as path from 'node:path';
import * as fs from 'node:fs';
import ZipFile from 'adm-zip';

import { ToolsLogger } from '@sap-ux/logger';
import { readUi5Config } from '@sap-ux/adp-tooling';
import type { AbapTarget } from '@sap-ux/system-access';
import { createAbapServiceProvider } from '@sap-ux/system-access';
import type { AbapServiceProvider, MergedAppDescriptor } from '@sap-ux/axios-extension';

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

const APP_FIELDS_LIST = [
    'sap.app/id',
    'sap.app/ach',
    'sap.fiori/registrationIds',
    'sap.app/title',
    'url',
    'fileType',
    'repoName'
];

const LIBRARY_WITH_DESCR_FILTER: UI5AppFilter = {
    fields: APP_FIELDS_LIST.join(','),
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
    const provider = await getSystemProvider(await getSystemUrl(appPath));
    const lrepService = provider.getLayeredRepository();
    await lrepService.getCsrfToken();

    const manifest = (await readManifest(appPath)) as AppDescrVariant;

    const zip = new ZipFile();
    zip.addLocalFolder(path.join(appPath, 'webapp'));

    const merged = await lrepService.mergeAppDescriptorVariant(zip.toBuffer(), '//');
    return merged[manifest.id];
}

/**
 * Resolves OData data sources from the merged manifest and fetches their metadata.
 *
 * @param appPath - Adaptation project root.
 * @returns OData data source entries with id, url, metadata, and the bound model (if any).
 */
export async function readAnnotationfromManifest(appPath: string): Promise<ODataMetadataEntry[]> {
    const abapProvider = await getSystemProvider(await getSystemUrl(appPath));
    const mergedManifest = await readMergedManifest(appPath);

    const ui5Models = (mergedManifest.manifest['sap.ui5']?.models ?? {}) as Record<string, Ui5Model>;
    const modelsByDataSource = new Map<string, Ui5Model>();
    for (const model of Object.values(ui5Models)) {
        if (model.dataSource) {
            modelsByDataSource.set(model.dataSource, model);
        }
    }

    const dataSources = mergedManifest.manifest['sap.app'].dataSources ?? {};
    const entries: ODataMetadataEntry[] = [];
    for (const [name, dataSource] of Object.entries(dataSources)) {
        if (dataSource.type !== 'OData') {
            continue;
        }
        const oData = abapProvider.service(dataSource.uri);
        entries.push({
            id: name,
            url: dataSource.uri,
            metadata: await oData.metadata(),
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
    const provider = await getSystemProvider(await getSystemUrl(appPath));
    const appIndex = await provider.getAppIndex();
    const response = await appIndex.search(LIBRARY_WITH_DESCR_FILTER);
    return response.flat();
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
 * @returns Parsed `webapp/manifest.appdescr_variant`, or `''` if unreadable.
 */
async function readManifest(appPath: string): Promise<AppDescrVariant | ''> {
    const manifestPath = path.join(appPath, 'webapp', 'manifest.appdescr_variant');
    try {
        const fileContents = await fs.promises.readFile(manifestPath, 'utf-8');
        return JSON.parse(fileContents) as AppDescrVariant;
    } catch {
        return '';
    }
}

/**
 * Creates an ABAP service provider for the given system.
 *
 * @param system - System URL and client.
 * @returns ABAP service provider for the target.
 */
function getSystemProvider(system: systemPath): Promise<AbapServiceProvider> {
    const target: AbapTarget = { url: system.url, client: system.client };
    return createAbapServiceProvider(target, { ignoreCertErrors: false }, false, logger);
}
