import type { Command } from 'commander';
import { generateEslintConfig } from '@sap-ux/app-config-writer';
import { getLogger, traceChanges, setLogLevelVerbose } from '../../tracing';
import { validateBasePath } from '../../validation';
import { getProjectType } from '@sap-ux/project-access';

/**
 * Add the "add eslint config" command to a passed command.
 *
 * @param cmd - commander command for adding eslint config command
 */
export function addAddEslintConfigCommand(cmd: Command): void {
    cmd.command('eslint-config [path]')
        .description(
            `Add an \`eslint\` configuration to a project including SAP Fiori tools lint plugin (\`@sap-ux/eslint-plugin-fiori-tools\`).\n
Example:
    \`npx --yes @sap-ux/create@latest add eslint-config\``
        )
        .option('-s, --simulate', 'Simulate only. Do not write to the config file. Also, sets `--verbose`')
        .option('-v, --verbose', 'Show verbose information.')
        .option(
            '-c, --config',
            'The name of the SAP Fiori tools eslint plugin configuration to be used (default is `recommended`).'
        )
        .action(async (path, options) => {
            if (options.verbose === true || options.simulate) {
                setLogLevelVerbose();
            }
            await addEslintConfig(path || process.cwd(), !!options.simulate, options.config);
        });
}

/**
 * Adds an eslint config to an app.
 *
 * @param basePath - path to application root
 * @param simulate - if true, do not write but just show what would be changed; otherwise write
 * @param config - the name of the SAP Fiori tools eslint plugin config to be used
 */
async function addEslintConfig(basePath: string, simulate: boolean, config?: string): Promise<void> {
    const logger = getLogger();
    try {
        logger.debug(`Called add eslint-config for path '${basePath}', simulate is '${simulate}'`);
        await validateBasePath(basePath);
        //todo: find out the most appropriate config value if not given as parameter instead of just using 'recommended' as default
        config ??= 'recommended';
        const fs = await generateEslintConfig(basePath, { logger, config });
        await traceChanges(fs);
        if (!simulate) {
            fs.commit(() =>
                logger.info(
                    `Eslint configuration written. Please make sure to install the new dependency by running 'npm install'.`
                )
            );
        }
    } catch (error) {
        logger.error(`Error while executing add eslint-config '${(error as Error).message}'`);
        logger.debug(error as Error);
    }
    if ((await getProjectType(basePath)) !== 'EDMXBackend') {
        logger.info(
            `You can execute \`npm run lint --workspaces --if-present\` from the CAP project root to lint app.`
        );
        logger.info(
            `You can add a command such as \`&& npm run lint --workspaces --if-present\` to an existing command in the CAP project root where linting is executed.
            A complete command may look like:
        //  \`"lint": "cds lint  && npm run lint --workspaces --if-present"\``
        );
    }
}
