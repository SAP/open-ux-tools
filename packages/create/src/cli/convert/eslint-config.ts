import type { Command } from 'commander';
import { getLogger, setLogLevelVerbose, traceChanges } from '../../tracing';
import { validateBasePath } from '../../validation';
import { convertEslintConfig as migrateEslintConfig } from '@sap-ux/app-config-writer';
import { runNpmInstallCommand } from '../../common';
import { execNpmCommand } from '@sap-ux/project-access';
import { join } from 'node:path';

/**
 * Add a new sub-command to convert the eslint configuration of a project to flat config format (eslint version 9).
 *
 * @param {Command} cmd - The command to add the convert sub-command to.
 */
export function addConvertEslintCommand(cmd: Command): void {
    cmd.command('eslint-config [path]')
        .description(
            `Executed in the root folder of an app, it converts the ESLint configuration of the respective app to flat config format (used since ESLint version 9). It also introduces specific ESLint checks for SAP Fiori applications (using the \`@sap-ux/eslint-plugin-fiori-tools\` plugin), and deletes the deprecated \`eslint-plugin-fiori-custom\` plugin. To avoid dependency resolution conflicts, it deletes the \`package-lock.json\` file as well as the \`@sap-ux/eslint-plugin-fiori-tools\` module from the \`node_modules\` folder before running \`npm install\`.\n
Examples:
    \`npx --yes @sap-ux/create@latest convert eslint-config\``
        )
        .option('-s, --simulate', 'Simulate only. Do not write to the config file. Also, sets `--verbose`')
        .option('-v, --verbose', 'Show verbose information.')
        .option(
            '-c, --config <string>',
            'The name of the SAP Fiori tools ESLint plugin configuration to be used.',
            'recommended'
        )
        .option(
            '-n, --skip-install',
            'Skip the `npm install` step. Also skips deleting the `package-lock.json` file and the `@sap-ux/eslint-plugin-fiori-tools` module from the `node_modules` folder.'
        )
        .action(async (path, options) => {
            if (options.verbose === true || options.simulate) {
                setLogLevelVerbose();
            }
            // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
            await convertEslintConfig(path || process.cwd(), !!options.simulate, options.config, !!options.skipInstall);
        });
}

/**
 * Converts an eslint config to flat config format (eslint version 9).
 *
 * @param basePath - path to application root
 * @param simulate - if true, simulates the conversion without writing to the config file. Also, sets `--verbose`
 * @param config - the name of the SAP Fiori tools eslint plugin config to be used
 * @param skipInstall - if true, skips the `npm install` step after converting the eslint config
 */
async function convertEslintConfig(
    basePath: string,
    simulate: boolean,
    config: string,
    skipInstall = false
): Promise<void> {
    const logger = getLogger();
    try {
        logger.debug(`Called add eslint-config for path '${basePath}', simulate is '${simulate}'`);
        await validateBasePath(basePath);
        const fs = await migrateEslintConfig(basePath, { logger, config });
        await traceChanges(fs);
        if (!simulate) {
            if (!skipInstall) {
                logger.info(`Deleting \`package-lock.json\` to avoid conflicts.`);
                fs.delete(join(basePath, 'package-lock.json'));
            }
            fs.commit(() => {
                logger.info(
                    `ESlint configuration converted. Ensure the new configuration is working correctly before deleting old configuration files like '.eslintrc.json' or '.eslintignore'.`
                );
                if (skipInstall) {
                    logger.info(
                        `\`npm install\` was skipped. Ensure you install the dependencies before executing any linting commands.`
                    );
                } else {
                    logger.info(
                        `Deleting \`@sap-ux/eslint-plugin-fiori-tools\` from \`node_modules\` to avoid dependency resolution conflicts.`
                    );
                    execNpmCommand(['uninstall', '@sap-ux/eslint-plugin-fiori-tools', '--no-save'], {
                        cwd: basePath,
                        logger: logger
                    })
                        .then(() => {
                            logger.info('npm uninstall completed successfully.');
                            logger.info(`Executing \`npm install\`.`);
                            runNpmInstallCommand(basePath, undefined, { logger });
                        })
                        .catch((error) => {
                            logger.error(`npm (un)install failed. '${(error as Error).message}'`);
                        });
                }
            });
        }
    } catch (error) {
        logger.error(`Error while executing convert eslint-config. '${(error as Error).message}'`);
        logger.debug(error as Error);
    }
}
