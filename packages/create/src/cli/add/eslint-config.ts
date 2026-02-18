import type { Command } from 'commander';
import { generateEslintConfig } from '@sap-ux/app-config-writer';
import { getLogger, traceChanges, setLogLevelVerbose } from '../../tracing';
import { validateBasePath } from '../../validation';
import { getProjectType } from '@sap-ux/project-access';
import { runNpmInstallCommand } from '../../common';

/**
 * Add the "add eslint config" command to a passed command.
 *
 * @param cmd - commander command for adding eslint config command
 */
export function addAddEslintConfigCommand(cmd: Command): void {
    cmd.command('eslint-config [path]')
        .description(
            `Add an ESLint configuration to a project including the SAP Fiori tools lint plugin (\`@sap-ux/eslint-plugin-fiori-tools\`).\n
Example:
    \`npx --yes @sap-ux/create@latest add eslint-config\``
        )
        .option('-s, --simulate', 'Simulate only. Do not write to the config file. Also, sets `--verbose`')
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
            await addEslintConfig(path || process.cwd(), !!options.simulate, options.config, !!options.skipInstall);
        });
}

/**
 * Adds an eslint config to an app.
 *
 * @param basePath - path to application root
 * @param simulate - if true, do not write but just show what would be changed; otherwise write
 * @param config - the name of the SAP Fiori tools eslint plugin config to be used
 * @param skipInstall - if true, skips the `npm install` step after adding the eslint config
 */
async function addEslintConfig(
    basePath: string,
    simulate: boolean,
    config: string,
    skipInstall = false
): Promise<void> {
    const logger = getLogger();
    try {
        logger.debug(`Called add eslint-config for path '${basePath}', simulate is '${simulate}'`);
        await validateBasePath(basePath);
        const fs = await generateEslintConfig(basePath, { logger, config });
        await traceChanges(fs);
        if (!simulate) {
            fs.commit(() => {
                logger.info(
                    `ESlint configuration written. Ensure you install the new dependency by executing 'npm install'.`
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
        logger.error(`Error while executing add eslint-config. '${(error as Error).message}'`);
        logger.debug(error as Error);
    }
    if ((await getProjectType(basePath)) !== 'EDMXBackend') {
        logger.info(
            `You can execute \`npm run lint --workspaces --if-present\` from the CAP project root to lint app.`
        );
        logger.info(
            `You can add a command such as \`&& npm run lint --workspaces --if-present\` to an existing command in the CAP project root where linting is executed.
            A complete command is similar to the following:
        //  \`"lint": "cds lint  && npm run lint --workspaces --if-present"\``
        );
    }
}
