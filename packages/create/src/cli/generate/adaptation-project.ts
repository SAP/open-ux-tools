import path from 'path';
import chalk from 'chalk';
import {
    generate,
    EndpointsService,
    ManifestService,
    ProviderService,
    FlexLayer,
    UI5VersionService,
    ConfigInfoPrompter,
    getBasicInfoPrompts,
    getFlpPrompts,
    getDeployPrompts,
    TemplateModel
} from '@sap-ux/adp-tooling';
import { create } from 'mem-fs-editor';
import { create as createStorage } from 'mem-fs';

import type { Command } from 'commander';
import type { DeployConfigAnswers, FlpConfigAnswers } from '@sap-ux/adp-tooling';

import { getLogger, traceChanges } from '../../tracing';
import { filterLabelTypeQuestions } from '../../common/prompts';
import { promptYUIQuestions, runNpmInstallCommand } from '../../common';

/**
 * Add a new sub-command to generate SAP UI5 adaptation projects the given command.
 *
 * @param cmd main command that is to be enhanced
 */
export function addGenerateAdaptationProjectCommand(cmd: Command): void {
    cmd.command('adaptation-project [path]')
        .option('-n, --skip-install', 'skip npm install step')
        .option('-s, --simulate', 'simulate only do not write or install')
        .action(async (path, options) => {
            console.log(
                `\nThe generation of adaptation projects outside of SAP Business Application Studio is currently ${chalk.bold(
                    'experimental'
                )}.`
            );
            console.log(
                'Please report any issues or feedback at https://github.com/SAP/open-ux-tools/issues/new/choose.\n'
            );
            await generateAdaptationProject(path, !!options.simulate, !!options.skipInstall);
        });
}

/**
 * Generate an SAP UI5 adaptation project based on the given parameters.
 *
 * @param basePath target folder of the new project
 * @param simulate if set to true, then no files will be written to the filesystem
 * @param skipInstall if set to true then `npm i` is not executed in the new project
 */
async function generateAdaptationProject(basePath: string, simulate: boolean, skipInstall: boolean): Promise<void> {
    const logger = getLogger();
    try {
        logger.debug(`Called generate adaptation-project for path '${basePath}', skip install is '${skipInstall}'`);

        const fs = create(createStorage());
        const endpointsService = new EndpointsService(logger);
        const providerService = new ProviderService(endpointsService, logger);
        const manifestService = new ManifestService(providerService, logger);

        const layer = FlexLayer.CUSTOMER_BASE;

        const ui5Service = new UI5VersionService(layer);
        const configPrompter = new ConfigInfoPrompter(
            providerService,
            manifestService,
            endpointsService,
            ui5Service,
            layer,
            logger
        );

        const templateModel = new TemplateModel(ui5Service, providerService, manifestService, layer);

        const basicAnswers = await promptYUIQuestions(getBasicInfoPrompts(basePath, layer), false);
        logger.debug(`Basic information: ${JSON.stringify(basicAnswers)}`);

        const configAnswers = await promptYUIQuestions(
            await filterLabelTypeQuestions(await configPrompter.getConfigurationPrompts(basicAnswers.projectName)),
            false
        );
        logger.debug(`System: ${configAnswers.system}`);
        logger.debug(`Application: ${JSON.stringify(configAnswers.application, null, 2)}`);

        const isCloudProject = configAnswers.projectType === 'cloudReady';

        let flpConfigAnswers: FlpConfigAnswers;
        let deployConfigAnswers: DeployConfigAnswers;
        if (isCloudProject) {
            flpConfigAnswers = await promptYUIQuestions(
                await filterLabelTypeQuestions(
                    await getFlpPrompts(manifestService, isCloudProject, configAnswers.application.id)
                ),
                false
            );
            logger.debug(`FLP Configuration: ${JSON.stringify(flpConfigAnswers, null, 2)}`);

            deployConfigAnswers = await promptYUIQuestions(await getDeployPrompts(providerService, logger), false);
            logger.debug(`Deploy Configuration: ${JSON.stringify(deployConfigAnswers, null, 2)}`);
        }

        const systemAuthDetails = await endpointsService.getSystemDetails(configAnswers.system);

        if (!systemAuthDetails) {
            throw new Error(`No system details were found!`);
        }

        const config = await templateModel.getTemplateModel(
            systemAuthDetails,
            basicAnswers,
            configAnswers,
            flpConfigAnswers!,
            deployConfigAnswers!
        );
        logger.debug(`Config for generation: ${JSON.stringify(config, null, 2)}`);

        if (!basePath) {
            basePath = path.join(process.cwd(), config.app.id);
        }

        const projectPath = path.join(basePath, basicAnswers.projectName);
        await generate(projectPath, config, fs);

        if (!simulate) {
            await new Promise((resolve) => fs.commit(resolve));
            if (!skipInstall) {
                runNpmInstallCommand(projectPath);
                logger.info('Executed npm install');
            }
        } else {
            await traceChanges(fs);
        }
    } catch (error) {
        logger.error(error.message);
    }
}
