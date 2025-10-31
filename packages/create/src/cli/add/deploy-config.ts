import { type AppType, FileName, getAppType } from '@sap-ux/project-access';
import { generate as generateDeployConfig } from '@sap-ux/abap-deploy-config-writer';
import { getLogger, traceChanges, setLogLevelVerbose } from '../../tracing';
import { validateBasePath } from '../../validation';
import {
    type AbapDeployConfigAnswers,
    type AbapDeployConfigPromptOptions,
    getPrompts as getAbapDeployConfigPrompts,
    reconcileAnswers
} from '@sap-ux/abap-deploy-config-inquirer';
import { prompt, type PromptObject } from 'prompts';
import type { AbapDeployConfig } from '@sap-ux/ui5-config';
import type { Command } from 'commander';
import { promptYUIQuestions } from '../../common';

/**
 * Add the "add deploy config" command to a passed command.
 *
 * @param cmd - commander command for adding deploy config command
 */
export function addDeployConfigCommand(cmd: Command): void {
    cmd.command('deploy-config [path]')
        .description(
            `Prompt for ABAP deployment configuration details and adds and updates the project files accordingly.
                                     Example usage:
                                     \`$ npx -y @sap-ux/create@latest add deploy-config\``
        )
        .option('-t, --target <string>', 'Target for deployment: ABAP or Cloud Foundry (not yet implemented)')
        .option('-s, --simulate', 'Simulate only. Do not write. Also, sets \`--verbose\`')
        .option('-v, --verbose', 'Show verbose information.')
        .option('-b, --base-file <string>', 'The base config file of the project. _(default: \"ui5.yaml\")_')
        .option(
            '-d, --deploy-file <string>',
            'The name of the deploy config file to be written. _(default: \"ui5-deploy.yaml\")_'
        )
        .action(async (path, options) => {
            if (options.verbose === true || options.simulate) {
                setLogLevelVerbose();
            }
            await addDeployConfig(
                path || process.cwd(),
                options.target,
                options.simulate,
                options.baseFile ?? FileName.Ui5Yaml,
                options.deployFile ?? FileName.UI5DeployYaml
            );
        });
}

/**
 * Prompts the user to select the target for deployment.
 *
 * @param target - target for deployment
 * @returns target
 */
async function getTarget(target?: string): Promise<'abap' | 'cf'> {
    if (!target || (target !== 'abap' && target !== 'cf')) {
        const question: PromptObject = {
            name: 'target',
            type: 'select',
            message: 'Select the target for deployment',
            choices: [
                { title: 'ABAP', value: 'abap' }
                // { title: 'Cloud Foundry', value: 'cf' }
            ]
        };
        return (await prompt(question)).target;
    } else {
        return target;
    }
}

/**
 * Adds a deploy config to an app or project.
 *
 * @param basePath - path to application root
 * @param target - target for deployment (ABAP or Cloud Foundry)
 * @param simulate - simulate only do not write
 * @param baseFile - base file name
 * @param deployFile - deploy file name
 */
async function addDeployConfig(
    basePath: string,
    target?: 'abap' | 'cf',
    simulate = false,
    baseFile?: string,
    deployFile?: string
): Promise<void> {
    const logger = getLogger();
    try {
        const appType = await getAppType(basePath);
        const isAdp = isAdpProject(appType);

        if (!isAdp) {
            target = await getTarget(target);
        } else {
            target = 'abap';
        }

        if (target === 'cf') {
            logger.info('Cloud Foundry deployment is not yet implemented.');
            return;
        } else if (target === 'abap') {
            logger.debug(`Called add deploy-config for path '${basePath}', simulate is '${simulate}'`);

            await validateBasePath(basePath);

            const promptOptions: AbapDeployConfigPromptOptions = {
                ui5AbapRepo: { hideIfOnPremise: isAdp },
                packageAutocomplete: {
                    useAutocomplete: true,
                    additionalValidation: {
                        shouldValidatePackageType: isAdp,
                        shouldValidatePackageForStartingPrefix: isAdp
                    }
                },
                packageManual: {
                    additionalValidation: {
                        shouldValidatePackageType: isAdp,
                        shouldValidatePackageForStartingPrefix: isAdp
                    }
                },
                transportInputChoice: { hideIfOnPremise: isAdp },
                targetSystem: { additionalValidation: { shouldRestrictDifferentSystemType: isAdp } }
            };
            const { prompts: abapPrompts, answers: abapAnswers } = await getAbapDeployConfigPrompts(
                promptOptions,
                logger,
                false
            );

            const answers = reconcileAnswers(
                await promptYUIQuestions<AbapDeployConfigAnswers>(abapPrompts, false),
                abapAnswers
            );

            const config = {
                target: {
                    url: answers.url,
                    client: answers.client,
                    scp: answers.scp,
                    destination: answers.destination
                },
                app: {
                    name: answers.ui5AbapRepo,
                    package: answers.package,
                    description: answers.description,
                    transport: answers.transport
                },
                index: answers.index
            } satisfies AbapDeployConfig;

            logger.debug(`Adding deployment configuration : ${JSON.stringify(config, null, 2)}`);
            const fs = await generateDeployConfig(basePath, config, {
                baseFile,
                deployFile,
                addBuildToUndeployScript: !isAdp
            });
            await traceChanges(fs);

            if (!simulate) {
                fs.commit(() => {
                    logger.info(`Changes written.`);
                });
            }
        }
    } catch (error) {
        logger.error(`Error while executing add deploy-config '${(error as Error).message}'`);
        logger.debug(error as Error);
    }
}

/**
 * Checks if the given application type is a Fiori Adaptation project.
 *
 * @param {AppType} [appType] - The application type to check.
 * @returns {boolean} `true` if the app type is 'Fiori Adaptation', otherwise `false`.
 */
function isAdpProject(appType?: AppType): boolean {
    return appType === 'Fiori Adaptation';
}
