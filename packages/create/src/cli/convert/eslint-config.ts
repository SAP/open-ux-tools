import type { Command } from 'commander';
import { getLogger, setLogLevelVerbose, traceChanges } from '../../tracing';
import { validateBasePath } from '../../validation';
import { convertEslintConfig as migrateEslintConfig } from '@sap-ux/app-config-writer';
import { runNpmInstallCommand } from '../../common';
/**
 * Add a new sub-command to convert the eslint configuration of a project to flat config format (eslint version 9).
 *
 * @param {Command} cmd - The command to add the convert sub-command to.
 */
export function addConvertEslintCommand(cmd: Command): void {
    cmd.command('eslint-config [path]')
        .description(
            `Executed in the root folder of an app, it converts the eslint configuration of the respective app to flat config format (eslint version 9).\n
Examples:
    \`npx --yes @sap-ux/create@latest convert eslint-config\``
        )
        .option('-s, --simulate', 'Simulate only. Do not write.')
        .option('-v, --verbose', 'Show verbose information.')
        .option(
            '-c, --config <string>',
            'The name of the SAP Fiori tools eslint plugin configuration to be used.',
            'recommended'
        )
        .option('-n, --skip-install', 'Skip the `npm install` step.')
        .action(async (path, options) => {
            if (options.verbose === true || options.simulate) {
                setLogLevelVerbose();
            }
            await convertEslintConfig(path || process.cwd(), !!options.simulate, options.config, !!options.skipInstall);
        });
}

/**
 * Converts an eslint config to flat config format (eslint version 9).
 *
 * @param basePath - path to application root
 * @param simulate - if true, do not write but just show what would be changed; otherwise write
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
        //todo: The migration command does not support a simulate mode. Either
        // * we do not allow simulate for this command or
        // * we skip the migration command when simulating.
        const fs = await migrateEslintConfig(basePath, { logger, config });
        await traceChanges(fs);
        if (!simulate) {
            fs.commit(() => {
                logger.info(
                    `Eslint configuration converted. Ensure you install the new dependency by executing 'npm install'.`
                );
                if (skipInstall) {
                    logger.info(
                        `\`npm install\` will be skipped. Please make sure to install the dependencies before executing any linting commands.`
                    );
                } else {
                    runNpmInstallCommand(basePath);
                }
            });
        }
    } catch (error) {
        logger.error(`Error while executing convert eslint-config. '${(error as Error).message}'`);
        logger.debug(error as Error);
    }
}
