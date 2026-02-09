import type { Command } from 'commander';
import { generateEslintConfig } from '@sap-ux/app-config-writer';
import { getLogger, traceChanges, setLogLevelVerbose } from '../../tracing';
import { validateBasePath } from '../../validation';

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
        .action(async (path, options) => {
            if (options.verbose === true || options.simulate) {
                setLogLevelVerbose();
            }
            await addEslintConfig(path || process.cwd(), !!options.simulate);
        });
}

/**
 * Adds an eslint config to an app.
 *
 * @param basePath - path to application root
 * @param simulate - if true, do not write but just show what would be changed; otherwise write
 */
async function addEslintConfig(basePath: string, simulate: boolean): Promise<void> {
    const logger = getLogger();
    try {
        logger.debug(`Called add eslint-config for path '${basePath}', simulate is '${simulate}'`);
        await validateBasePath(basePath);
        const fs = await generateEslintConfig(basePath, { logger });
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
}
