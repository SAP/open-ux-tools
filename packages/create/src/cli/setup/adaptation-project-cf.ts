import type { Command } from 'commander';
import { join } from 'path';
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'fs';
import { readUi5Yaml, FileName } from '@sap-ux/project-access';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import { getLogger, traceChanges, setLogLevelVerbose } from '../../tracing';
import { validateBasePath } from '../../validation';

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

        // Step 2: Process ui5appinfo.json and extract reusable libraries
        await processUi5AppInfo(basePath, simulate, logger);

        // Step 3: Add serve-static-middleware configuration to ui5.yaml
        await addServeStaticMiddleware(basePath, simulate, logger);

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
 * Process ui5appinfo.json and extract reusable library information to .reuse folder.
 *
 * @param basePath - path to application root
 * @param simulate - simulate only, do not write
 * @param logger - logger instance
 */
async function processUi5AppInfo(basePath: string, simulate: boolean, logger: any): Promise<void> {
    try {
        const ui5AppInfoPath = join(__dirname, 'ui5appinfo.json');

        if (!existsSync(ui5AppInfoPath)) {
            logger.warn('ui5appinfo.json not found in command directory, skipping reusable library processing');
            return;
        }

        logger.info('Processing ui5appinfo.json...');
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
            logger.info('No reusable libraries found in ui5appinfo.json');
            return;
        }

        logger.info(`Found ${reusableLibs.length} reusable libraries`);

        // Write ui5appinfo.json to .reuse directory
        const reusePath = join(basePath, '.reuse');
        const ui5AppInfoTargetPath = join(reusePath, 'ui5appinfo.json');

        if (!simulate) {
            if (!existsSync(reusePath)) {
                mkdirSync(reusePath, { recursive: true });
            }

            writeFileSync(ui5AppInfoTargetPath, JSON.stringify(ui5AppInfo, null, 2), 'utf-8');
            logger.info(`Written ui5appinfo.json to ${reusePath}`);
        } else {
            logger.info('[Simulate] Would write ui5appinfo.json to .reuse folder');
        }
    } catch (error) {
        logger.error(`Failed to process ui5appinfo.json: ${(error as Error).message}`);
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

        // Check if serve-static-middleware already exists
        const existingMiddleware = ui5Config.findCustomMiddleware('serve-static-middleware');

        if (existingMiddleware) {
            logger.info('serve-static-middleware already exists in ui5.yaml');
            return;
        }

        // Read ui5appinfo.json from .reuse directory
        const ui5AppInfoPath = join(basePath, '.reuse', 'ui5appinfo.json');
        if (!existsSync(ui5AppInfoPath)) {
            logger.warn(
                'ui5appinfo.json not found in .reuse directory, skipping serve-static-middleware configuration'
            );
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
                'No reusable libraries found in ui5appinfo.json, skipping serve-static-middleware configuration'
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
