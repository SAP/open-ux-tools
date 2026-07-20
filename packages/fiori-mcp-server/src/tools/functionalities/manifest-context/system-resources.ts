import * as path from 'node:path';
import * as fs from 'node:fs';

import { ToolsLogger } from '@sap-ux/logger';
import { readUi5Config, isCFEnvironment, getExistingAdpProjectType } from '@sap-ux/adp-tooling';
import type { AbapTarget } from '@sap-ux/system-access';
import { createAbapServiceProvider } from '@sap-ux/system-access';
import { create, ODataVersion } from '@sap-ux/axios-extension';
import type { AppIndex, ODataServiceInfo, ServiceProvider, AbapServiceProvider } from '@sap-ux/axios-extension';

export type SystemPath = {
    url: string;
    client: string;
};

export type ProjectType = 'cf' | 'onPremise' | 'cloudReady';

type UI5AppFilter = {
    fields: string;
    readonly ['sap.ui/technology']?: 'UI5';
    readonly ['sap.app/type']: 'application' | 'library';
} & Record<string, string>;

const LIBRARY_WITH_DESCR_FILTER: UI5AppFilter = {
    fields: ['sap.app/id', 'sap.app/title', 'url', 'repoName', 'sap.ui5/componentName'].join(','),
    'sap.ui/technology': 'UI5',
    'sap.app/type': 'library',
    'fileType': 'appdescr'
};

const CONTEXT_DIR = path.join('webapp', '.context');

export const LIBRARIES_FILE = 'libraries.json';
export const ODATA_SERVICES_FILE = 'odata-services.json';

/**
 * Determines the project type for a given application path.
 *
 * Detects Cloud Foundry environments first, then falls back to resolving the
 * ABAP ADP project type. Throws if neither can be determined.
 *
 * @param appPath - Absolute path to the project root.
 * @returns The resolved project type.
 * @throws {Error} If the project type cannot be determined.
 */
export async function getProjectType(appPath: string): Promise<ProjectType> {
    if (await isCFEnvironment(appPath)) {
        return 'cf';
    }
    const projectType = await getExistingAdpProjectType(appPath);
    if (projectType) {
        return projectType as ProjectType;
    }

    throw new Error(
        `Unable to determine project type for ${appPath}. Please ensure the project is a valid ADP project.`
    );
}

/**
 * Builds the POSIX-style `webapp/.context/<fileName>` label for a context file.
 * Uses forward slashes regardless of platform so it is safe in user-facing
 * messages and cross-platform snapshots.
 *
 * @param fileName - Basename under `webapp/.context/`.
 * @returns Slash-separated relative path label.
 */
export function contextFileLabel(fileName: string): string {
    return `webapp/.context/${fileName}`;
}

/**
 * Builds the basename for a data source's persisted OData metadata document.
 *
 * @param dataSource - Data source name from the merged manifest.
 * @returns Basename under `webapp/.context/` (e.g. `main-metadata.xml`).
 */
export function metadataFileName(dataSource: string): string {
    return `${dataSource}-metadata.xml`;
}

export const logger = new ToolsLogger({ logPrefix: 'fiori-mcp-server' });

/**
 * Lists OData V2 and V4 services available in the target system's catalog.
 *
 * @param appPath - Adaptation project root.
 * @param filter - Case-insensitive substring matched against service names.
 *   Empty string returns every service.
 * @returns Combined service catalog entries from the V2 and V4 catalogs.
 */
export async function getAvailableODataServices(appPath: string, filter: string): Promise<Array<ODataServiceInfo>> {
    if ((await getProjectType(appPath)) === 'cf') {
        throw new Error(`Available OData services can only be retrieved for Cloud Foundry projects.`);
    }

    const abapProvider = (await getProvider(appPath)) as AbapServiceProvider;

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
 * Queries the system's app index for UI5 libraries with an `appdescr` file.
 *
 * @param appPath - Adaptation project root.
 * @returns Library entries returned by the app index.
 */
export async function getAvailableLibraryFromSystem(appPath: string): Promise<AppIndex> {
    if ((await getProjectType(appPath)) === 'cf') {
        throw new Error(`Available libraries can only be retrieved for Cloud Foundry projects.`);
    }

    const provider = (await getProvider(appPath)) as AbapServiceProvider;
    const appIndex = await provider.getAppIndex();
    return appIndex.search(LIBRARY_WITH_DESCR_FILTER);
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
export async function getProvider(appPath: string): Promise<ServiceProvider | AbapServiceProvider> {
    const system = await getSystemUrl(appPath);

    if ((await getProjectType(appPath)) === 'cf') {
        return create({ baseURL: system.url });
    }
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
