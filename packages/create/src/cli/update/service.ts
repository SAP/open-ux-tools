import type { AxiosRequestConfig } from '@sap-ux/axios-extension';
import {
    AbapCloudEnvironment,
    AbapServiceProvider,
    createForAbapOnCloud,
    createForDestination,
    ODataVersion as CatalogODataVersion,
    TlsPatch
} from '@sap-ux/axios-extension';
import { isAppStudio, WebIDEUsage } from '@sap-ux/btp-utils';
import type { EdmxAnnotationsInfo, OdataService } from '@sap-ux/odata-service-writer';
import {
    getExternalServiceReferences,
    OdataVersion,
    ServiceType,
    update as updateOdataService
} from '@sap-ux/odata-service-writer';
import { createApplicationAccess, FileName } from '@sap-ux/project-access';
import type { BackendSystem } from '@sap-ux/store';
import { BackendSystemKey, getService } from '@sap-ux/store';
import { UI5Config } from '@sap-ux/ui5-config';
import type { Command } from 'commander';
import { create as createStore } from 'mem-fs';
import { create as createEditor } from 'mem-fs-editor';
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { getLogger, setLogLevelVerbose, traceChanges } from '../../tracing/index.js';
import { validateBasePath } from '../../validation/index.js';

type BackendConfig = ReturnType<
    InstanceType<typeof UI5Config>['getBackendConfigsFromFioriToolsProxyMiddleware']
>[number];
type Logger = ReturnType<typeof getLogger>;

/**
 * Creates an AbapServiceProvider for the given backend config.
 * Returns null and logs an error if the required config is missing.
 *
 * @param backendConfig
 * @param logger
 */
async function buildProvider(backendConfig: BackendConfig, logger: Logger): Promise<AbapServiceProvider | null> {
    if (isAppStudio()) {
        if (!backendConfig.destination) {
            logger.error(
                `No destination found in '${FileName.Ui5Yaml}'. Add a 'destination' entry to the backend configuration to connect in SAP Business Application Studio.`
            );
            return null;
        }
        const destination = { Name: backendConfig.destination, WebIDEUsage: WebIDEUsage.ODATA_ABAP };
        return createForDestination({}, destination) as AbapServiceProvider;
    }

    const backendUrl = backendConfig.connectPath
        ? new URL(backendConfig.connectPath, backendConfig.url).href
        : backendConfig.url;
    const clientSuffix = backendConfig.client ? ` (client ${backendConfig.client})` : '';

    const systemService = await getService<BackendSystem, BackendSystemKey>({ entityName: 'system' });
    if (!systemService) {
        logger.error(
            `A stored connection configuration for backend system '${backendUrl}'${clientSuffix} cannot be found. Use 'npx @sap-ux/create@latest add system' to create a matching entry.`
        );
        return null;
    }
    const system = await systemService.read(new BackendSystemKey({ url: backendUrl, client: backendConfig.client }));
    if (!system) {
        logger.error(`No stored system found for URL '${backendUrl}'${clientSuffix}. Run 'sap-ux add system' first.`);
        return null;
    }
    const providerConfig: AxiosRequestConfig = {
        baseURL: backendConfig.url,
        params: { 'sap-client': backendConfig.client },
        ...(system.username ? { auth: { username: system.username, password: system.password ?? '' } } : {})
    };
    if (TlsPatch.isPatchRequired(providerConfig.baseURL ?? '')) {
        TlsPatch.apply();
    }

    if (system.authenticationType === 'reentranceTicket' || system.serviceKeys) {
        return createForAbapOnCloud({
            environment: AbapCloudEnvironment.EmbeddedSteampunk,
            url: backendConfig.url
        });
    }
    return new AbapServiceProvider(providerConfig);
}

/**
 * Fetches external (value-help) services when requested.
 * Returns undefined if not requested, none found, or the fetch fails.
 *
 * @param provider
 * @param servicePath
 * @param metadataXml
 * @param fetchExternal
 * @param logger
 */
async function fetchExternalServicesIfRequested(
    provider: AbapServiceProvider,
    servicePath: string,
    metadataXml: string,
    fetchExternal: boolean,
    logger: Logger
): Promise<Awaited<ReturnType<AbapServiceProvider['fetchExternalServices']>> | undefined> {
    if (!fetchExternal) {
        return undefined;
    }
    const references = getExternalServiceReferences(servicePath, metadataXml);
    if (references.length === 0) {
        logger.debug('No external service references found in metadata');
        return undefined;
    }
    logger.info(`Fetching ${references.length} external service(s)...`);
    try {
        const externalServices = await provider.fetchExternalServices(references);
        logger.debug(`Fetched ${externalServices.length} external service(s)`);
        return externalServices;
    } catch (error) {
        logger.warn(
            `Could not fetch external service metadata: ${(error as Error).message}. Continuing without external services.`
        );
        logger.debug(error);
        return undefined;
    }
}

/**
 * Fetches the service's remote annotations from the backend catalog.
 * Returns undefined when none are available or the fetch fails, so that a metadata refresh
 * never deletes the existing local annotation files (see odata-service-writer guard).
 *
 * @param provider
 * @param servicePath
 * @param odataVersion
 * @param logger
 */
async function fetchAnnotations(
    provider: AbapServiceProvider,
    servicePath: string,
    odataVersion: OdataVersion,
    logger: Logger
): Promise<EdmxAnnotationsInfo[] | undefined> {
    // OData V4 embeds annotations in the metadata; the catalog returns none.
    if (odataVersion === OdataVersion.v4) {
        return undefined;
    }
    try {
        const annotations = await provider.catalog(CatalogODataVersion.v2).getAnnotations({ path: servicePath });
        if (annotations.length === 0) {
            logger.debug('No remote annotations found for service');
            return undefined;
        }
        logger.debug(`Fetched ${annotations.length} annotation source(s)`);
        return annotations.map((annotation) => ({
            technicalName: annotation.TechnicalName,
            xml: annotation.Definitions
        }));
    } catch (error) {
        logger.warn(
            `Could not fetch annotations: ${(error as Error).message}. Existing local annotation files will be left untouched.`
        );
        logger.debug(error);
        return undefined;
    }
}

/**
 * Add the "update service-metadata" subcommand to a passed command.
 * Refreshes the local OData service metadata and value-help service metadata from the live backend.
 *
 * @param cmd - commander command to attach the service-metadata subcommand to
 */
export function addServiceUpdateCommand(cmd: Command): void {
    cmd.command('service-metadata <appPath>')
        .description(
            `Refresh the local OData service metadata.xml from the live backend for a Fiori application.
Also fetches value-help (external) service metadata when available.

Example:
    \`npx --yes @sap-ux/create@latest update service-metadata /path/to/my-fiori-app\`
    \`npx --yes @sap-ux/create@latest update service-metadata /path/to/my-fiori-app --simulate\``
        )
        .option(
            '--service <name>',
            'Name of the data source in manifest.json (defaults to mainService or first service)'
        )
        .option('--no-value-help', 'Skip fetching value-help (external) service metadata')
        .option('-s, --simulate', 'Simulate only. Do not write. Also sets `--verbose`.')
        .option('-v, --verbose', 'Show verbose information.')
        .action(async (appPath: string, options) => {
            if (options.verbose || options.simulate) {
                setLogLevelVerbose();
            }
            await updateService(resolve(appPath), options.valueHelp !== false, !!options.simulate, options.service);
        });
}

/**
 * Refreshes the local OData service metadata for a Fiori application.
 *
 * @param appPath - absolute path to the Fiori application root
 * @param fetchExternalServiceMetadata - whether to also fetch value-help service metadata
 * @param simulate - dry run; trace changes but do not write to disk
 * @param serviceNameOpt - name of the data source in manifest (defaults to mainService or first service)
 */
async function updateService(
    appPath: string,
    fetchExternalServiceMetadata: boolean,
    simulate: boolean,
    serviceNameOpt?: string
): Promise<void> {
    const logger = getLogger();
    try {
        logger.debug(`Called update service-metadata for path '${appPath}'`);
        await validateBasePath(appPath);

        const appAccess = await createApplicationAccess(appPath);
        const serviceName = serviceNameOpt ?? appAccess.app.mainService ?? Object.keys(appAccess.app.services)[0];
        if (!serviceName) {
            logger.error(`No OData service found in manifest for app at '${appPath}'`);
            return;
        }
        if (serviceNameOpt && !appAccess.app.services[serviceNameOpt]) {
            logger.error(
                `Service '${serviceNameOpt}' not found in manifest. Available: ${Object.keys(appAccess.app.services).join(', ')}`
            );
            return;
        }
        const servicePath = appAccess.app.services[serviceName]?.uri;
        if (!servicePath) {
            logger.error(`Service '${serviceName}' has no URI defined in manifest`);
            return;
        }

        const manifest = await appAccess.readManifest();
        const odataVersionRaw = manifest['sap.app']?.dataSources?.[serviceName]?.settings?.odataVersion;
        const odataVersion = odataVersionRaw?.startsWith('4') ? OdataVersion.v4 : OdataVersion.v2;
        logger.debug(`Service '${serviceName}' at path '${servicePath}' (OData ${odataVersion})`);

        const ui5YamlContent = await readFile(join(appPath, FileName.Ui5Yaml), 'utf-8');
        const ui5Config = await UI5Config.newInstance(ui5YamlContent);
        const backendConfig = ui5Config.getBackendConfigsFromFioriToolsProxyMiddleware()[0];
        if (!backendConfig) {
            logger.error(`No backend configuration found in '${FileName.Ui5Yaml}' for app at '${appPath}'`);
            return;
        }

        const provider = await buildProvider(backendConfig, logger);
        if (!provider) {
            return;
        }

        logger.info(`Fetching metadata for service '${serviceName}'...`);
        let metadataXml: string;
        try {
            metadataXml = await provider.service(servicePath).metadata();
        } catch (error) {
            if (isAppStudio() && backendConfig.destination) {
                throw new Error(
                    `The service metadata is returning an error. Please check that the destination '${backendConfig.destination}' exists and the service is accessible.`
                );
            }
            throw error;
        }
        logger.debug(`Received metadata for service '${serviceName}'`);

        const externalServices = await fetchExternalServicesIfRequested(
            provider,
            servicePath,
            metadataXml,
            fetchExternalServiceMetadata,
            logger
        );

        const annotations = await fetchAnnotations(provider, servicePath, odataVersion, logger);

        const serviceData: OdataService = {
            name: serviceName,
            path: servicePath,
            version: odataVersion,
            type: ServiceType.EDMX,
            metadata: metadataXml,
            annotations,
            externalServices,
            previewSettings: {
                path: backendConfig.path,
                url: backendConfig.url,
                client: backendConfig.client,
                destination: backendConfig.destination,
                connectPath: backendConfig.connectPath
            }
        };

        const memStore = createStore();
        const fs = createEditor(memStore);
        // updateMiddlewares = false: refresh metadata.xml, annotation files and manifest dataSources only.
        // The ui5*.yaml middlewares are intentionally left untouched by a metadata re-sync.
        await updateOdataService(appPath, serviceData, fs, false);

        await traceChanges(fs);
        if (!simulate) {
            await new Promise<void>((resolve, reject) => fs.commit((err) => (err ? reject(err) : resolve())));
            logger.info('Metadata updated.');
        }
    } catch (error) {
        logger.error((error as Error).message);
        logger.debug(error);
    }
}
