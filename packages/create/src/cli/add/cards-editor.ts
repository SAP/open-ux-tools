import type { Command } from 'commander';
import { enableCardsEditor } from '@sap-ux/cards-editor-config-writer';
import { getLogger, traceChanges, setLogLevelVerbose } from '../../tracing';
import { validateBasePath } from '../../validation';
import { runNpmInstallCommand } from '../../common';

/**
 * Add the cards-editor-config command.
 *
 * @param cmd - commander command for adding navigation inbounds config command
 */
export function addCardsEditorConfigCommand(cmd: Command): void {
    cmd.command('cards-editor [path]')
        .option('-n, --skip-install', 'skip npm install step')
        .option('-s, --simulate', 'simulate only do not write config; sets also --verbose')
        .option('-v, --verbose', 'show verbose information')
        .action(async (path, options) => {
            if (options.verbose === true || options.simulate) {
                setLogLevelVerbose();
            }
            await addCardsEditorConfig(path || process.cwd(), !!options.simulate, !!options.skipInstall);
        });
}

/**
 * Adds an cards editor config to an app. To prevent overwriting existing inbounds will be checked.
 *
 * @param basePath - path to application root
 * @param simulate - if true, do not write but just show what would be change; otherwise write
 * @param skipInstall - if true, do not run npm install
 */
async function addCardsEditorConfig(basePath: string, simulate: boolean, skipInstall: boolean): Promise<void> {
    const logger = getLogger();
    try {
        logger.debug(`Called add cards-editor-config for path '${basePath}', simulate is '${simulate}'`);
        await validateBasePath(basePath);

        const fs = await enableCardsEditor(basePath);
        if (!simulate) {
            await new Promise((resolve) => fs.commit(resolve));
            if (!skipInstall) {
                runNpmInstallCommand(basePath, [], { logger });
            }
        } else {
            await traceChanges(fs);
        }
    } catch (error) {
        logger.error(`Error while executing add cards editor configuration '${(error as Error).message}'`);
        logger.debug(error as Error);
    }
}
