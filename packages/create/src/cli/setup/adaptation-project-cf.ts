import type { Command } from 'commander';
import { join } from 'path';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { readUi5Yaml, FileName } from '@sap-ux/project-access';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import type { ToolsLogger } from '@sap-ux/logger';
import { getLogger, traceChanges, setLogLevelVerbose } from '../../tracing';
import { validateBasePath } from '../../validation';
import {
    getBackendUrlsWithPaths,
    getServiceInstanceKeys,
    getCfUi5AppInfo,
    loadCfConfig,
    getAppHostIds,
    getVariant,
    type ServiceKeys,
    type CfUi5AppInfo
} from '@sap-ux/adp-tooling';
import type { CfConfig } from '@sap-ux/adp-tooling';
import { log } from 'console';

/**
 * Add the "setup adaptation-project-cf" command to a passed command.
 *
 * @param cmd - commander command for setting up CF adaptation project
 */
export function addSetupAdaptationProjectCFCommand(cmd: Command): void {
    cmd.command('adaptation-project-cf [path]')
        .description(
            `Setup a Cloud Foundry adaptation project by fetching reusable libraries, building the project, and configuring ui5.yaml.\n
Example:
    \`npx --yes @sap-ux/create@latest setup adaptation-project-cf\``
        )
        .option('-v, --verbose', 'Show verbose information.')
        .action(async (path, options) => {
            if (options.verbose === true) {
                setLogLevelVerbose();
            }
            await setupAdaptationProjectCF(path || process.cwd());
        });
}

/**
 * Setup a Cloud Foundry adaptation project.
 *
 * @param basePath - path to application root
 */
async function setupAdaptationProjectCF(basePath: string): Promise<void> {
    const logger = getLogger();
    await validateBasePath(basePath);

    // Step 0: Verify user is logged in to Cloud Foundry
    try {
        execSync('cf oauth-token', { stdio: 'pipe' });
    } catch (error) {
        logger.error(
            'You are not logged in to Cloud Foundry or your session has expired. Please run "cf login" first.'
        );
        throw new Error();
    }

    try {
        // Step 1: Verify this is an adaptation project
        const manifestVariantPath = join(basePath, 'webapp', 'manifest.appdescr_variant');
        if (!existsSync(manifestVariantPath)) {
            throw new Error('Not an adaptation project. manifest.appdescr_variant not found.');
        }

        const serviceKeys = await fetchServiceKeys(basePath, logger);

        await fetchUi5AppInfo(basePath, logger, serviceKeys);

        await addServeStaticMiddleware(basePath, logger);

        await buildProject(basePath, logger);

        await addBackendProxyMiddleware(basePath, logger, serviceKeys);

        logger.info('CF adaptation project setup complete!');
    } catch (error) {
        logger.error(`Failed to setup CF adaptation project: ${(error as Error).message}`);
        throw error;
    }
}

/**
 * Process ui5AppInfo.json and extract reusable library information to .reuse folder.
 *
 * @param basePath - path to application root
 * @param logger - logger instance
 * @param serviceKeys - service keys from Cloud Foundry
 */
async function fetchUi5AppInfo(basePath: string, logger: ToolsLogger, serviceKeys: ServiceKeys[]): Promise<void> {
    try {
        const cfConfig = getCfConfig(logger);
        const appId = await getBaseAppId(basePath, logger);
        const appHostIds = getAppHostIds(serviceKeys);

        if (appHostIds.length === 0) {
            throw new Error('No app host IDs found in service keys.');
        }

        logger.info(`Fetching ui5AppInfo.json from FDC for appId: ${appId}, appHostIds: ${appHostIds.join(', ')}`);

        const ui5AppInfo: CfUi5AppInfo = await getCfUi5AppInfo(appId, appHostIds, cfConfig, logger);

        const ui5AppInfoTargetPath = join(basePath, 'ui5AppInfo.json');
        writeFileSync(ui5AppInfoTargetPath, JSON.stringify(ui5AppInfo, null, 2), 'utf-8');
        logger.info(`Written ui5AppInfo.json to ${basePath}`);
    } catch (error) {
        logger.error(`Failed to process ui5AppInfo.json: ${(error as Error).message}`);
        throw error;
    }
}

/**
 * Build the project using npm run build.
 *
 * @param basePath - path to application root
 * @param logger - logger instance
 */
async function buildProject(basePath: string, logger: ToolsLogger): Promise<void> {
    try {
        logger.info('Building the project...');

        execSync('npm run build', {
            cwd: basePath,
            stdio: 'inherit',
            env: {
                ...process.env,
                ADP_BUILDER_MODE: 'preview'
            }
        });

        logger.info('Project built successfully');
    } catch (error) {
        const exitCode = (error as any).status ?? 'unknown';
        logger.error(`Build failed: ${(error as Error).message}`);
        throw new Error(`Build process exited with code ${exitCode}`);
    }
}

/**
 * Add serve-static-middleware configuration to ui5.yaml if not already present.
 *
 * @param basePath - path to application root
 * @param logger - logger instance
 */
async function addServeStaticMiddleware(basePath: string, logger: ToolsLogger): Promise<void> {
    try {
        const ui5YamlPath = join(basePath, FileName.Ui5Yaml);
        const ui5Config = await readUi5Yaml(basePath, FileName.Ui5Yaml);
        const existingMiddleware = ui5Config.findCustomMiddleware('serve-static-middleware');

        if (existingMiddleware) {
            ui5Config.removeCustomMiddleware('serve-static-middleware');
        }

        const ui5AppInfoPath = join(basePath, 'ui5AppInfo.json');
        if (!existsSync(ui5AppInfoPath)) {
            logger.warn('ui5AppInfo.json not found in project root, skipping serve-static-middleware configuration');
            return;
        }

        const ui5AppInfoData = JSON.parse(readFileSync(ui5AppInfoPath, 'utf-8'));
        const ui5AppInfo = ui5AppInfoData[Object.keys(ui5AppInfoData)[0]] as CfUi5AppInfo;

        const reusableLibs =
            ui5AppInfo.asyncHints?.libs?.filter(
                (lib) => lib.html5AppName && lib.url && typeof lib.url === 'object' && lib.url.url !== undefined
            ) ?? [];

        if (reusableLibs.length === 0) {
            logger.info(
                'No reusable libraries found in ui5AppInfo.json, skipping serve-static-middleware configuration'
            );
            return;
        }

        const paths = reusableLibs.flatMap((lib) => {
            const libName = String(lib.name);
            const html5AppName = String(lib.html5AppName);
            const resourcePath = '/resources/' + libName.replace(/\./g, '/');

            const urlPath =
                lib.url && typeof lib.url === 'object' && lib.url.url ? lib.url.url.split('/~')[0] : '/' + html5AppName;

            return [
                {
                    path: resourcePath,
                    src: `./.reuse/${html5AppName}`,
                    fallthrough: false
                },
                {
                    path: urlPath,
                    src: `./.reuse/${html5AppName}`,
                    fallthrough: false
                }
            ];
        });

        // Add the serve-static-middleware configuration
        ui5Config.addCustomMiddleware([
            {
                name: 'serve-static-middleware',
                beforeMiddleware: 'ui5-proxy-middleware',
                configuration: {
                    paths
                }
            }
        ]);

        // Write the updated configuration back to the file
        const fs = create(createStorage());
        fs.write(ui5YamlPath, ui5Config.toString());
        await new Promise<void>((resolve, reject) => {
            fs.commit([], (err: Error | null) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
        await traceChanges(fs);
        logger.info('Successfully added serve-static-middleware to ui5.yaml');
    } catch (error) {
        logger.warn(`Could not add serve-static-middleware configuration: ${(error as Error).message}`);
        throw error;
    }
}

/**
 * Add backend-proxy-middleware-cf configuration to ui5.yaml.
 *
 * @param basePath - path to application root
 * @param logger - logger instance
 * @param serviceKeys - service keys from Cloud Foundry
 */
async function addBackendProxyMiddleware(
    basePath: string,
    logger: ToolsLogger,
    serviceKeys: ServiceKeys[]
): Promise<void> {
    try {
        const ui5YamlPath = join(basePath, FileName.Ui5Yaml);
        const ui5Config = await readUi5Yaml(basePath, FileName.Ui5Yaml);

        while (ui5Config.findCustomMiddleware('backend-proxy-middleware-cf')) {
            ui5Config.removeCustomMiddleware('backend-proxy-middleware-cf');
        }

        if (!serviceKeys || serviceKeys.length === 0) {
            logger.warn('No service keys found. Backend proxy middleware will not be configured.');
            return;
        }

        const reusePath = join(basePath, '.reuse');
        const urlsWithPaths = getBackendUrlsWithPaths(serviceKeys, reusePath);

        ui5Config.addCustomMiddleware([
            {
                name: 'backend-proxy-middleware-cf',
                afterMiddleware: 'compression',
                configuration: {
                    backends: urlsWithPaths
                }
            }
        ]);

        const fs = create(createStorage());
        fs.write(ui5YamlPath, ui5Config.toString());
        await new Promise<void>((resolve, reject) => {
            fs.commit([], (err: Error | null) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
        await traceChanges(fs);
        logger.info('Successfully added backend-proxy-middleware-cf to ui5.yaml');
    } catch (error) {
        logger.warn(`Could not add backend-proxy-middleware-cf configuration: ${(error as Error).message}`);
    }
}

/**
 * Get CF configuration from Cloud Foundry CLI.
 *
 * @param logger - logger instance
 * @returns CF configuration
 */
function getCfConfig(logger: ToolsLogger): CfConfig {
    try {
        const cfConfig = loadCfConfig(logger);

        if (!cfConfig.org || !cfConfig.space || !cfConfig.token || !cfConfig.url) {
            throw new Error('Incomplete CF configuration. Make sure you are logged in to Cloud Foundry.');
        }

        logger.info(`Using CF org: ${cfConfig.org.Name}, space: ${cfConfig.space.Name}`);

        return cfConfig;
    } catch (error) {
        logger.error(`Failed to get CF configuration: ${(error as Error).message}`);
        throw new Error('Unable to get CF configuration. Make sure you are logged in to Cloud Foundry.');
    }
}

/**
 * Get base application ID from variant.
 *
 * @param basePath - path to application root
 * @param logger - logger instance
 * @returns App ID (reference)
 */
async function getBaseAppId(basePath: string, logger: ToolsLogger): Promise<string> {
    try {
        const variant = await getVariant(basePath);

        if (!variant.reference) {
            throw new Error('No reference found in manifest.appdescr_variant');
        }

        logger.info(`Read appId from manifest.appdescr_variant: ${variant.reference}`);

        return variant.reference;
    } catch (error) {
        logger.error(`Failed to get app ID: ${(error as Error).message}`);
        throw error;
    }
}

/**
 * Fetch service keys from Cloud Foundry.
 * This reads the service instance name from ui5.yaml and fetches the service keys from CF.
 *
 * @param basePath - path to application root
 * @param logger - logger instance
 * @returns Service keys array or null if not found
 */
async function fetchServiceKeys(basePath: string, logger: ToolsLogger): Promise<ServiceKeys[]> {
    try {
        const ui5Config = await readUi5Yaml(basePath, FileName.Ui5Yaml);
        const bundlerTask = ui5Config.findCustomTask<{ serviceInstanceName?: string }>('app-variant-bundler-build');
        const serviceInstanceName = bundlerTask?.configuration?.serviceInstanceName;

        if (!serviceInstanceName) {
            throw new Error('No serviceInstanceName found in app-variant-bundler-build configuration');
        }

        // Get service keys from Cloud Foundry
        const serviceInfo = await getServiceInstanceKeys(
            {
                names: [serviceInstanceName]
            },
            logger
        );

        if (!serviceInfo?.serviceKeys || serviceInfo.serviceKeys.length === 0) {
            throw new Error(`No service keys found for service instance: ${serviceInstanceName}`);
        }

        return serviceInfo.serviceKeys;
    } catch (error) {
        logger.error(`Could not fetch service keys: ${(error as Error).message}`);
        throw error;
    }
}
