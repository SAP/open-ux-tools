import type { Command } from 'commander';
import { join } from 'path';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { readUi5Yaml, FileName } from '@sap-ux/project-access';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import { getLogger, traceChanges, setLogLevelVerbose } from '../../tracing';
import { validateBasePath } from '../../validation';
import { getBackendUrlsWithPaths, getServiceInstanceKeys } from '@sap-ux/adp-tooling';

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
        .option('-s, --simulate', 'Simulate only. Do not write or build. Also, sets `--verbose`')
        .option('-v, --verbose', 'Show verbose information.')
        .option('--endpoint <string>', 'CF endpoint URL to fetch reusable libraries from.')
        .action(async (path, options) => {
            if (options.verbose === true || options.simulate) {
                setLogLevelVerbose();
            }
            await setupAdaptationProjectCF(path || process.cwd(), options.simulate, options.endpoint);
        });
}

/**
 * Setup a Cloud Foundry adaptation project.
 *
 * @param basePath - path to application root
 * @param simulate - simulate only, do not write
 * @param _endpoint - CF endpoint URL to fetch libraries from (currently unused)
 */
async function setupAdaptationProjectCF(basePath: string, simulate: boolean, _endpoint?: string): Promise<void> {
    const logger = getLogger();
    await validateBasePath(basePath);

    logger.info(`Setting up CF adaptation project at: ${basePath}`);

    try {
        // Step 1: Verify this is an adaptation project
        const manifestVariantPath = join(basePath, 'webapp', 'manifest.appdescr_variant');
        if (!existsSync(manifestVariantPath)) {
            throw new Error('Not an adaptation project. manifest.appdescr_variant not found.');
        }

        // Step 2: Process ui5AppInfo.json and extract reusable libraries
        await processUi5AppInfo(basePath, simulate, logger);

        // Step 3: Add serve-static-middleware configuration to ui5.yaml
        await addServeStaticMiddleware(basePath, simulate, logger);

        // Step 4: Build the project
        await buildProject(basePath, simulate, logger);

        // Step 5: Add backend-proxy-middleware-cf configuration to ui5.yaml
        await addBackendProxyMiddleware(basePath, simulate, logger);

        if (simulate) {
            logger.info('Simulation complete. No changes were written.');
        } else {
            logger.info('CF adaptation project setup complete!');
        }
    } catch (error) {
        logger.error(`Failed to setup CF adaptation project: ${(error as Error).message}`);
        throw error;
    }
}

/**
 * Process ui5AppInfo.json and extract reusable library information to .reuse folder.
 *
 * @param basePath - path to application root
 * @param simulate - simulate only, do not write
 * @param logger - logger instance
 */
async function processUi5AppInfo(basePath: string, simulate: boolean, logger: any): Promise<void> {
    try {
        const ui5AppInfoPath = join(__dirname, 'ui5AppInfo.json');

        if (!existsSync(ui5AppInfoPath)) {
            logger.warn('ui5AppInfo.json not found in command directory, skipping reusable library processing');
            return;
        }

        logger.info('Processing ui5AppInfo.json...');
        const ui5AppInfo = JSON.parse(readFileSync(ui5AppInfoPath, 'utf-8')) as {
            asyncHints?: {
                libs?: Array<{
                    name: string;
                    html5AppName?: string;
                    html5AppVersion?: string;
                    html5AppHostId?: string;
                    html5CacheToken?: string;
                    url?: { url: string };
                }>;
            };
        };

        // Extract reusable libraries from asyncHints.libs (filter out standard UI5 libraries)
        const reusableLibs =
            ui5AppInfo.asyncHints?.libs?.filter(
                (lib) =>
                    lib.html5AppName &&
                    lib.url &&
                    // Only include libraries with custom URL (reuse libraries)
                    typeof lib.url === 'object' &&
                    lib.url.url !== undefined
            ) ?? [];

        if (reusableLibs.length === 0) {
            logger.info('No reusable libraries found in ui5AppInfo.json');
            return;
        }

        logger.info(`Found ${reusableLibs.length} reusable libraries`);

        // Write ui5AppInfo.json to webapp folder
        const webappPath = join(basePath, 'webapp');
        if (!existsSync(webappPath)) {
            throw new Error('webapp folder not found in project');
        }

        const ui5AppInfoTargetPath = join(webappPath, 'ui5AppInfo.json');

        if (!simulate) {
            writeFileSync(ui5AppInfoTargetPath, JSON.stringify(ui5AppInfo, null, 2), 'utf-8');
            logger.info(`Written ui5AppInfo.json to ${webappPath}`);
        } else {
            logger.info('[Simulate] Would write ui5AppInfo.json to webapp folder');
        }
    } catch (error) {
        logger.error(`Failed to process ui5AppInfo.json: ${(error as Error).message}`);
        throw error;
    }
}

/**
 * Build the project using npm run build.
 *
 * @param basePath - path to application root
 * @param simulate - simulate only, do not build
 * @param logger - logger instance
 */
async function buildProject(basePath: string, simulate: boolean, logger: any): Promise<void> {
    try {
        if (simulate) {
            logger.info('[Simulate] Would run: npm run build');
            return;
        }

        logger.info('Building the project...');

        const { spawn } = await import('child_process');

        await new Promise<void>((resolve, reject) => {
            const buildProcess = spawn('npm', ['run', 'build'], {
                cwd: basePath,
                stdio: 'inherit',
                shell: true,
                env: {
                    ...process.env,
                    ADP_BUILDER_MODE: 'preview'
                }
            });

            buildProcess.on('close', (code) => {
                if (code === 0) {
                    logger.info('Project built successfully');
                    resolve();
                } else {
                    reject(new Error(`Build process exited with code ${code}`));
                }
            });

            buildProcess.on('error', (error) => {
                reject(new Error(`Failed to start build process: ${error.message}`));
            });
        });
    } catch (error) {
        logger.error(`Build failed: ${(error as Error).message}`);
        throw error;
    }
}

/**
 * Add serve-static-middleware configuration to ui5.yaml if not already present.
 *
 * @param basePath - path to application root
 * @param simulate - simulate only, do not write
 * @param logger - logger instance
 */
async function addServeStaticMiddleware(basePath: string, simulate: boolean, logger: any): Promise<void> {
    try {
        const ui5YamlPath = join(basePath, FileName.Ui5Yaml);
        const ui5Config = await readUi5Yaml(basePath, FileName.Ui5Yaml);

        // Check if serve-static-middleware already exists and remove it
        const existingMiddleware = ui5Config.findCustomMiddleware('serve-static-middleware');

        if (existingMiddleware) {
            logger.info('serve-static-middleware already exists in ui5.yaml, replacing it');
            ui5Config.removeCustomMiddleware('serve-static-middleware');
        }

        // Read ui5AppInfo.json from webapp folder
        const ui5AppInfoPath = join(basePath, 'webapp', 'ui5AppInfo.json');
        if (!existsSync(ui5AppInfoPath)) {
            logger.warn('ui5AppInfo.json not found in webapp folder, skipping serve-static-middleware configuration');
            return;
        }

        const ui5AppInfo = JSON.parse(readFileSync(ui5AppInfoPath, 'utf-8')) as {
            asyncHints?: {
                libs?: Array<{
                    name: string;
                    html5AppName?: string;
                    url?: { url: string };
                }>;
            };
        };

        // Extract reusable libraries from asyncHints.libs (filter out standard UI5 libraries)
        const reusableLibs =
            ui5AppInfo.asyncHints?.libs?.filter(
                (lib) =>
                    lib.html5AppName &&
                    lib.url &&
                    // Only include libraries with custom URL (reuse libraries)
                    typeof lib.url === 'object' &&
                    lib.url.url !== undefined
            ) ?? [];

        if (reusableLibs.length === 0) {
            logger.warn(
                'No reusable libraries found in ui5AppInfo.json, skipping serve-static-middleware configuration'
            );
            return;
        }

        logger.info('Adding serve-static-middleware configuration to ui5.yaml');

        // Build paths configuration from reusable libraries
        const paths = reusableLibs.map((lib) => {
            const libName = String(lib.name);
            const html5AppName = String(lib.html5AppName);
            // Convert library name to resource path (e.g., "com.sap.apm.reusablecontrols.ui" -> "/resources/com/sap/apm/reusablecontrols/ui")
            const resourcePath = '/resources/' + libName.replace(/\./g, '/');

            return {
                path: resourcePath,
                src: `./.reuse/${html5AppName}`,
                fallthrough: false
            };
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

        if (!simulate) {
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
        } else {
            logger.info('[Simulate] Would add serve-static-middleware to ui5.yaml');
        }
    } catch (error) {
        logger.warn(`Could not add serve-static-middleware configuration: ${(error as Error).message}`);
        throw error;
    }
}

/**
 * Add backend-proxy-middleware-cf configuration to ui5.yaml.
 *
 * @param basePath - path to application root
 * @param simulate - simulate only, do not write
 * @param logger - logger instance
 */
async function addBackendProxyMiddleware(basePath: string, simulate: boolean, logger: any): Promise<void> {
    try {
        const ui5YamlPath = join(basePath, FileName.Ui5Yaml);
        const ui5Config = await readUi5Yaml(basePath, FileName.Ui5Yaml);

        // Remove all existing backend-proxy-middleware-cf instances
        while (ui5Config.findCustomMiddleware('backend-proxy-middleware-cf')) {
            ui5Config.removeCustomMiddleware('backend-proxy-middleware-cf');
        }

        // Get service keys from Cloud Foundry
        const serviceKeys = await fetchServiceKeys(basePath, logger);
        if (!serviceKeys || serviceKeys.length === 0) {
            logger.warn('No service keys found. Backend proxy middleware will not be configured.');
            return;
        }

        // Extract backend URLs mapped to their corresponding paths based on destination matching
        const reusePath = join(basePath, '.reuse');

        // Debug logging
        logger.debug(`Reuse path: ${reusePath}`);
        logger.debug(`Reuse path exists: ${existsSync(reusePath)}`);
        logger.debug(`xs-app.json exists: ${existsSync(join(reusePath, 'xs-app.json'))}`);
        logger.debug(`Service keys endpoints: ${JSON.stringify(serviceKeys[0]?.credentials?.endpoints, null, 2)}`);

        const urlsWithPaths = getBackendUrlsWithPaths(serviceKeys, reusePath);

        if (urlsWithPaths.length === 0) {
            logger.warn('No backend URLs with matching destinations found');
            logger.warn('Please check:');
            logger.warn('1. .reuse/xs-app.json exists and contains routes with destinations');
            logger.warn('2. Service keys endpoints have matching destination names');
            logger.warn('3. xs-app.json routes have source paths defined');
            return;
        }

        logger.info(`Configuring backend proxy for ${urlsWithPaths.length} backend URL(s)`);

        // Add a single middleware instance with all backends
        ui5Config.addCustomMiddleware([
            {
                name: 'backend-proxy-middleware-cf',
                afterMiddleware: 'compression',
                configuration: {
                    backends: urlsWithPaths
                }
            }
        ]);

        // Log each backend configuration
        urlsWithPaths.forEach(({ url, paths }) => {
            logger.info(`Configured backend: ${url} with ${paths.length} path(s): ${paths.join(', ')}`);
        });

        if (!simulate) {
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
            logger.info('Successfully added backend-proxy-middleware-cf to ui5.yaml');
        } else {
            logger.info('[Simulate] Would add backend-proxy-middleware-cf to ui5.yaml');
        }
    } catch (error) {
        logger.warn(`Could not add backend-proxy-middleware-cf configuration: ${(error as Error).message}`);
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
async function fetchServiceKeys(basePath: string, logger: any): Promise<Array<{ credentials: any }> | null> {
    try {
        const ui5Config = await readUi5Yaml(basePath, FileName.Ui5Yaml);
        const bundlerTask = ui5Config.findCustomTask<{ serviceInstanceName?: string }>('app-variant-bundler-build');

        if (!bundlerTask) {
            logger.warn('No app-variant-bundler-build task found in ui5.yaml');
            return null;
        }

        const serviceInstanceName = bundlerTask.configuration?.serviceInstanceName;

        if (!serviceInstanceName) {
            logger.warn('No serviceInstanceName found in app-variant-bundler-build configuration');
            return null;
        }

        logger.info(`Fetching service keys for: ${serviceInstanceName}`);

        // Get service keys from Cloud Foundry
        const serviceInfo = await getServiceInstanceKeys(
            {
                names: [serviceInstanceName]
            },
            logger
        );

        if (!serviceInfo?.serviceKeys || serviceInfo.serviceKeys.length === 0) {
            logger.warn(`No service keys found for service instance: ${serviceInstanceName}`);
            return null;
        }

        logger.info(`Retrieved ${serviceInfo.serviceKeys.length} service key(s) from CF`);
        return serviceInfo.serviceKeys;
    } catch (error) {
        logger.warn(`Could not fetch service keys: ${(error as Error).message}`);
        return null;
    }
}
