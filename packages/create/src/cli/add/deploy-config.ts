import { FileName } from '@sap-ux/project-access';
import { generate as generateDeployConfig } from '@sap-ux/abap-deploy-config-writer';
import { getLogger, traceChanges, setLogLevelVerbose } from '../../tracing';
import { validateBasePath } from '../../validation';
import { prompt as abapDeployConfigPrompt } from '@sap-ux/abap-deploy-config-inquirer';
import { prompt, type PromptObject } from 'prompts';
import type { AbapTarget, BspApp } from '@sap-ux/ui5-config';
import type { Command } from 'commander';

/**
 * Add the "add deploy config" command to a passed command.
 *
 * @param cmd - commander command for adding deploy config command
 */
export function addDeployConfigCommand(cmd: Command): void {
    cmd.command('deploy-config [path]')
        .option('-t, --target <string>', 'target for deployment; ABAP or Cloud Foundry (not yet implemented)')
        .option('-s, --simulate', 'simulate only do not write; sets also --verbose')
        .option('-v, --verbose', 'show verbose information')
        .option('-b, --base-file <string>', 'the base file config file of the project; default : ui5.yaml')
        .option(
            '-d, --deploy-file <string>',
            'the name of the deploy config file to be written; default : ui5-deploy.yaml'
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
        target = (await prompt(question)).target;
    }
    return target as 'abap' | 'cf';
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
        target = await getTarget(target);

        if (target === 'cf') {
            logger.info('Cloud Foundry deployment is not yet implemented.');
            return;
        } else if (target === 'abap') {
            logger.debug(`Called add deploy-config for path '${basePath}', simulate is '${simulate}'`);
            await validateBasePath(basePath);
            const answers = await abapDeployConfigPrompt({ useAutocomplete: true });

            const config = {
                target: {
                    url: answers.url,
                    client: answers.client,
                    scp: answers.scp,
                    destination: answers.destination
                } as AbapTarget,
                app: {
                    name: answers.ui5AbapRepo,
                    package: answers.package,
                    description: answers.description,
                    transport: answers.transport
                } as BspApp,
                index: answers.index
            };

            logger.debug(`Adding deployment configuration : ${JSON.stringify(config, null, 2)}`);
            const fs = await generateDeployConfig(basePath, config, { baseFile, deployFile });
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
