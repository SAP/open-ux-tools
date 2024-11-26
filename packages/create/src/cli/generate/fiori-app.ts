import type { Command } from 'commander';
import { getLogger, traceChanges } from '../../tracing';
import { promptYUIQuestions, runNpmInstallCommand } from '../../common';
import type { Ui5App } from '@sap-ux/ui5-application-writer';
import { generate as generateUi5App } from '@sap-ux/ui5-application-writer';
import { getPrompts as getAppPrompts, promptNames } from '@sap-ux/ui5-application-inquirer';
import type { UI5ApplicationAnswers, UI5ApplicationPromptOptions } from '@sap-ux/ui5-application-inquirer';
import { join } from 'path';
import { generateInboundNavigationConfig, promptInboundNavigationConfig } from '@sap-ux/app-config-writer';

/**
 * Add a new sub-command to generate SAP UI5 adaptation projects the given command.
 *
 * @param cmd main command that is to be enhanced
 */
export function addGenerateFioriApp(cmd: Command): void {
    cmd.command('fiori-app [path]')
        .option('--id [id]', 'application id (e.g. my.example.app)')
        .option('-y, --yes', 'use default values for all prompts')
        .option('-n, --skip-install', 'skip npm install step')
        .option('-s, --simulate', 'simulate only do not write or install')
        .action(async (path, options) => {
            await generateFioriApp(
                path ?? process.cwd(),
                { ...options },
                !!options.yes,
                !!options.simulate,
                !!options.skipInstall
            );
        });
}

/**
 * Generate a Fiori project based on the given parameters.
 *
 * @param basePath target folder of the new project
 * @param defaults optional defaults
 * @param defaults.id optional id of the new app
 * @param useDefaults if set to true, then default values are used for all prompts and the prompting is skipped
 * @param simulate if set to true, then no files will be written to the filesystem
 * @param skipInstall if set to true then `npm i` is not executed in the new project
 */
async function generateFioriApp(
    basePath: string,
    defaults: { id?: string },
    useDefaults: boolean,
    simulate: boolean,
    skipInstall: boolean
): Promise<void> {
    const logger = getLogger();
    try {
        logger.info(`Executing generate Fiori app with skip install is '${skipInstall}'`);
        logger.debug(`Defaults: ${JSON.stringify(defaults)}`);

        const ui5AppOptions: UI5ApplicationPromptOptions = {
            targetFolder: {
                default: basePath
            },
            addDeployConfig: {
                hide: true
            },
            enableTypeScript: {
                default: true
            }
        };
        // hide advanced questions
        [
            promptNames.enableCodeAssist,
            promptNames.enableEslint,
            promptNames.skipAnnotations,
            promptNames.enableNPMWorkspaces
        ].forEach((name) => {
            ui5AppOptions[name as keyof typeof promptNames] = {
                advancedOption: true
            };
        });
        if (defaults.id) {
            const parts = defaults.id.split('.');
            ui5AppOptions.name = {
                default: parts.pop()
            };
            if (parts.length) {
                ui5AppOptions.namespace = {
                    default: parts.join('.')
                };
            }
        }
        const ui5AppPrompts = await getAppPrompts(ui5AppOptions);
        const ui5AppAnswers = await promptYUIQuestions<UI5ApplicationAnswers>(ui5AppPrompts, useDefaults);

        const config: Ui5App = {
            app: {
                id: ui5AppAnswers.namespace ? `${ui5AppAnswers.namespace}.${ui5AppAnswers.name}` : ui5AppAnswers.name!,
                title: ui5AppAnswers.title,
                description: ui5AppAnswers.description
            },
            package: {
                name: ui5AppAnswers.name!
            },
            ui5: {
                version: ui5AppAnswers.ui5Version,
                ui5Theme: ui5AppAnswers.ui5Theme
            },
            appOptions: {
                codeAssist: ui5AppAnswers.enableCodeAssist,
                typescript: ui5AppAnswers.enableTypeScript,
                eslint: ui5AppAnswers.enableEslint
            }
        };
        const targetPath = join(ui5AppAnswers.targetFolder ?? basePath, config.package.name);
        const fs = await generateUi5App(targetPath, config);

        if (ui5AppAnswers.addFlpConfig) {
            const { config } = await promptInboundNavigationConfig(targetPath, fs);
            if (config) {
                await generateInboundNavigationConfig(targetPath, config, true, fs);
            }
        }

        if (!simulate) {
            await new Promise((resolve) => fs.commit(resolve));
            if (!skipInstall) {
                runNpmInstallCommand(targetPath);
                logger.info('Executed npm install');
            }
        } else {
            await traceChanges(fs);
        }
    } catch (error) {
        logger.error(error.message);
    }
}
