import type { Command } from 'commander';
import { FileName } from '@sap-ux/project-access';
import { generate as generateDeployConfig } from '@sap-ux/abap-deploy-config-writer';
import { getLogger, traceChanges, setLogLevelVerbose } from '../../tracing';
import { validateBasePath } from '../../validation';
import { prompt as abapDeployConfigPrompt } from '@sap-ux/abap-deploy-config-inquirer';
import type { AbapTarget, BspApp } from '@sap-ux/ui5-config';

/**
 * Add the "add deploy config" command to a passed command.
 *
 * @param cmd - commander command for adding deploy config command
 */
export function addDeployConfigCommand(cmd: Command): void {
    cmd.command('deploy-config [path]')
        .option('-s, --simulate', 'simulate only do not write; sets also --verbose')
        .option('-v, --verbose', 'show verbose information')
        .option('-b, --base-file', 'the base file config file of the project; default : ui5.yaml')
        .option('-d, --deploy-file', 'the name of the deploy config file to be written; default : ui5-deploy.yaml')
        .action(async (path, options) => {
            if (options.verbose === true || options.simulate) {
                setLogLevelVerbose();
            }
            await addDeployConfig(
                path || process.cwd(),
                options.simulate,
                options.baseFile ?? FileName.Ui5Yaml,
                options.deployFile ?? FileName.UI5DeployYaml
            );
        });
}

/**
 * Adds a deploy config to an app or project.
 *
 * @param basePath - path to application root
 * @param simulate - simulate only do not write
 * @param baseFile - base file name
 * @param deployFile - deploy file name
 */
async function addDeployConfig(
    basePath: string,
    simulate = false,
    baseFile?: string,
    deployFile?: string
): Promise<void> {
    const logger = getLogger();
    try {
        logger.debug(`Called add deploy-config for path '${basePath}', simulate is '${simulate}'`);
        await validateBasePath(basePath);
        const answers = await abapDeployConfigPrompt({ useAutocomplete: false });

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
    } catch (error) {
        logger.error(`Error while executing add deploy-config '${(error as Error).message}'`);
        logger.debug(error as Error);
    }
}
