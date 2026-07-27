import type { Command } from 'commander';
import type { AxiosRequestConfig } from '@sap-ux/axios-extension';
import type { BackendSystem } from '@sap-ux/store';
import type { OdataService } from '@sap-ux/odata-service-writer';
import { AbapServiceProvider, TlsPatch, createForDestination } from '@sap-ux/axios-extension';
import { isAppStudio, WebIDEUsage } from '@sap-ux/btp-utils';
import { getService, BackendSystemKey } from '@sap-ux/store';
import { UI5Config } from '@sap-ux/ui5-config';
import { FileName, createApplicationAccess } from '@sap-ux/project-access';
import { update as updateService, getExternalServiceReferences, OdataVersion, ServiceType } from '@sap-ux/odata-service-writer';
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { create as createEditor } from 'mem-fs-editor';
import { create as createStore } from 'mem-fs';
import { getLogger, setLogLevelVerbose, traceChanges } from '../../tracing/index.js';
import { validateBasePath } from '../../validation/index.js';

/**
 * Add the "update metadata" subcommand to a passed command.
 * Refreshes the local OData service metadata and value-help service metadata from the live backend.
 *
 * @param cmd - commander command to attach the metadata subcommand to
 */
export function addMetadataUpdateCommand(cmd: Command): void {
    cmd.command('metadata <appPath>')
        .description(
            `Refresh the local OData service metadata.xml from the live backend for a Fiori application.
Also fetches value-help (external) service metadata when available.

Example:
    \`npx --yes @sap-ux/create@latest update metadata /path/to/my-fiori-app\`
    \`npx --yes @sap-ux/create@latest update metadata /path/to/my-fiori-app --simulate\``
        )
        .option('--no-value-help', 'Skip fetching value-help (external) service metadata')
        .option('-s, --simulate', 'Simulate only. Do not write. Also sets `--verbose`.')
        .option('-v, --verbose', 'Show verbose information.')
        .action(async (appPath: string, options) => {
            if (options.verbose || options.simulate) {
                setLogLevelVerbose();
            }
            await updateMetadata(resolve(appPath), options.valueHelp !== false, !!options.simulate);
        });
}

/**
 * Refreshes the local OData service metadata for a Fiori application.
 *
 * @param appPath - absolute path to the Fiori application root
 * @param fetchExternalServiceMetadata - whether to also fetch value-help service metadata
 * @param simulate - dry run; trace changes but do not write to disk
 */
async function updateMetadata(appPath: string, fetchExternalServiceMetadata: boolean, simulate: boolean): Promise<void> {
    const logger = getLogger();
    try {
        logger.debug(`Called update metadata for path '${appPath}'`);
        await validateBasePath(appPath);

        // Read manifest to get service name, path and OData version
        const appAccess = await createApplicationAccess(appPath);
        const serviceName = appAccess.app.mainService ?? Object.keys(appAccess.app.services)[0];
        if (!serviceName) {
            logger.error(`No OData service found in manifest for app at '${appPath}'`);
            return;
        }
        const servicePath = appAccess.app.services[serviceName]?.uri;
        if (!servicePath) {
            logger.error(`Service '${serviceName}' has no URI defined in manifest`);
            return;
        }

        const manifest = await appAccess.readManifest();
        const sappManifest = manifest['sap.app'] as unknown as
            | { dataSources?: Record<string, { settings?: { odataVersion?: string } }> }
            | undefined;
        const odataVersionRaw = sappManifest?.dataSources?.[serviceName]?.settings?.odataVersion;
        const odataVersion = odataVersionRaw === '4.0' ? OdataVersion.v4 : OdataVersion.v2;

        logger.debug(`Service '${serviceName}' at path '${servicePath}' (OData ${odataVersion})`);

        // Read ui5.yaml to get backend connection config
        const ui5YamlContent = await readFile(join(appPath, FileName.Ui5Yaml), 'utf-8');
        const ui5Config = await UI5Config.newInstance(ui5YamlContent);
        const backendConfig = ui5Config.getBackendConfigsFromFioriToolsProxyMiddleware()[0];
        if (!backendConfig) {
            logger.error(`No backend configuration found in '${FileName.Ui5Yaml}' for app at '${appPath}'`);
            return;
        }

        // Connect to backend
        let provider: AbapServiceProvider;
        if (isAppStudio()) {
            if (!backendConfig.destination) {
                logger.error(`No destination configured in '${FileName.Ui5Yaml}'. Cannot connect to backend in SAP Business Application Studio.`);
                return;
            }
            // WebIDEUsage.ODATA_ABAP is required so createForDestination returns an AbapServiceProvider.
            // Without it isAbapSystem() returns false and we get a base ServiceProvider which lacks fetchExternalServices.
            const destination = { Name: backendConfig.destination, WebIDEUsage: WebIDEUsage.ODATA_ABAP };
            provider = createForDestination({}, destination) as AbapServiceProvider;
        } else {
            const backendUrl = backendConfig.connectPath
                ? new URL(backendConfig.connectPath, backendConfig.url).href
                : backendConfig.url;
            const systemService = await getService<BackendSystem, BackendSystemKey>({ entityName: 'system' });
            const system = await systemService.read(new BackendSystemKey({ url: backendUrl, client: backendConfig.client }));
            if (!system) {
                logger.error(`No stored system found for URL '${backendUrl}'${backendConfig.client ? ` (client ${backendConfig.client})` : ''}. Run 'sap-ux add system' first.`);
                return;
            }
            const providerConfig: AxiosRequestConfig = {
                baseURL: backendConfig.url,
                params: { 'sap-client': backendConfig.client },
                ...(system.username ? { auth: { username: system.username, password: system.password ?? '' } } : {})
            };
            if (TlsPatch.isPatchRequired(providerConfig.baseURL ?? '')) {
                TlsPatch.apply();
            }
            provider = new AbapServiceProvider(providerConfig);
        }

        // Fetch main service metadata
        logger.info(`Fetching metadata for service '${serviceName}'...`);
        const metadataXml = await provider.service(servicePath).metadata();
        logger.debug(`Received metadata for service '${serviceName}'`);

        // Fetch external (value-help) service metadata when requested
        let externalServices: Awaited<ReturnType<AbapServiceProvider['fetchExternalServices']>> | undefined;
        if (fetchExternalServiceMetadata) {
            const references = getExternalServiceReferences(servicePath, metadataXml);
            if (references.length > 0) {
                logger.info(`Fetching ${references.length} external service(s)...`);
                try {
                    externalServices = await provider.fetchExternalServices(references);
                    logger.debug(`Fetched ${externalServices.length} external service(s)`);
                } catch (error) {
                    // The destination was assumed to be ABAP but may not be, or the backend
                    // does not support external service references. Log and continue with main metadata only.
                    logger.warn(`Could not fetch external service metadata: ${(error as Error).message}. Continuing without external services.`);
                    logger.debug(error);
                }
            } else {
                logger.debug('No external service references found in metadata');
            }
        }

        // Write files via odata-service-writer
        const serviceData: OdataService = {
            name: serviceName,
            path: servicePath,
            version: odataVersion,
            type: ServiceType.EDMX,
            metadata: metadataXml,
            externalServices,
            // Populate previewSettings from the existing backend config so the
            // proxy middleware update (when updateMiddlewares=true) is idempotent.
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
        // Only regenerate mockserver yaml (resolveExternalServiceReferences) when external
        // services were actually fetched; otherwise leave yaml unchanged.
        const updateMiddlewares = !!externalServices?.length;
        await updateService(appPath, serviceData, fs, updateMiddlewares);

        await traceChanges(fs);
        if (!simulate) {
            await new Promise<void>((resolve) => fs.commit(resolve));
            logger.info('Metadata updated.');
        }
    } catch (error) {
        logger.error((error as Error).message);
        logger.debug(error);
    }
}
