import type { Command } from 'commander';
import { getLogger, traceChanges } from '../../tracing';
import { promptYUIQuestions, runNpmInstallCommand } from '../../common';
import type { Ui5App } from '@sap-ux/ui5-application-writer';
import { generate as generateUi5App } from '@sap-ux/ui5-application-writer';
import { getPrompts as getAppPrompts } from '@sap-ux/ui5-application-inquirer';
import type { UI5ApplicationAnswers } from '@sap-ux/ui5-application-inquirer';
import { join } from 'path';

/**
 * Add a new sub-command to generate SAP UI5 adaptation projects the given command.
 *
 * @param cmd main command that is to be enhanced
 */
export function addGenerateFioriApp(cmd: Command): void {
    cmd.command('fiori-app [path]')
        .option('-n, --skip-install', 'skip npm install step')
        .option('-s, --simulate', 'simulate only do not write or install')
        .action(async (path, options) => {
            await generateFioriApp(path ?? process.cwd(), { ...options }, !!options.simulate, !!options.skipInstall);
        });
}

/**
 * Generate a Fiori project based on the given parameters.
 *
 * @param basePath target folder of the new project
 * @param _defaults optional defaults
 * @param simulate if set to true, then no files will be written to the filesystem
 * @param skipInstall if set to true then `npm i` is not executed in the new project
 */
async function generateFioriApp(
    basePath: string,
    _defaults: any,
    simulate: boolean,
    skipInstall: boolean
): Promise<void> {
    const logger = getLogger();
    try {
        logger.debug(`Called generate Fiori app for path '${basePath}', skip install is '${skipInstall}'`);
        const ui5AppPrompts = await getAppPrompts();
        const ui5AppAnswers = await promptYUIQuestions<UI5ApplicationAnswers>(ui5AppPrompts);

        const config: Ui5App = {
            app: {
                id: ui5AppAnswers.namespace ? `${ui5AppAnswers.namespace}.${ui5AppAnswers.name}` : ui5AppAnswers.name!
            },
            package: {
                name: ui5AppAnswers.name!
            }
        };

        const fs = await generateUi5App(join(basePath, config.package.name), config);

        if (!simulate) {
            await new Promise((resolve) => fs.commit(resolve));
            if (!skipInstall) {
                runNpmInstallCommand(basePath);
                logger.info('Executed npm install');
            }
        } else {
            await traceChanges(fs);
        }
    } catch (error) {
        logger.error(error.message);
    }
}
