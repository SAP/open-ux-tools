import type { Command } from 'commander';
import {
    generateChange,
    ChangeType,
    getPromptsForChangeDataSource,
    getAdpConfig,
    ManifestService,
    getVariant
} from '@sap-ux/adp-tooling';
import { getLogger, traceChanges } from '../../tracing';
import { promptYUIQuestions } from '../../common';
import { validateAdpProject } from '../../validation';
import { createAbapServiceProvider } from '@sap-ux/system-access';
import { FileName } from "@sap-ux/project-access";

let loginAttempts = 3;

/**
 * Add a new sub-command to change the data source of an adaptation project to the given command.
 *
 * @param {Command} cmd - The command to add the change data-source sub-command to.
 */
export function addChangeDataSourceCommand(cmd: Command): void {
    cmd.command('data-source [path]')
        .description(
            `Replace the OData Source of the base application in an adaptation project.
                                     Example usage:
                                     \`npx --yes @sap-ux/create@latest change data-source\``
        )
        .option('-s, --simulate', 'Simulate only. Do not write or install.')
        .option(
            '-c, --config <string>',
            'Path to the project configuration file in YAML format.',
            FileName.Ui5Yaml
        )
        .action(async (path, options) => {
            await changeDataSource(path, !!options.simulate, options.config);
        });
}

/**
 * Changes the data source of an adaptation project.
 *
 * @param {string} basePath - The path to the adaptation project.
 * @param {boolean} simulate - If set to true, then no files will be written to the filesystem.
 * @param {string} yamlPath - The path to the project configuration file in YAML format.
 */
async function changeDataSource(basePath: string, simulate: boolean, yamlPath: string): Promise<void> {
    const logger = getLogger();
    try {
        if (!basePath) {
            basePath = process.cwd();
        }
        await validateAdpProject(basePath);
        const variant = await getVariant(basePath);
        const { target, ignoreCertErrors = false } = await getAdpConfig(basePath, yamlPath);
        const provider = await createAbapServiceProvider(
            target,
            {
                ignoreCertErrors
            },
            true,
            logger
        );
        const manifestService = await ManifestService.initBaseManifest(provider, variant.reference, logger);
        const dataSources = manifestService.getManifestDataSources();
        const answers = await promptYUIQuestions(getPromptsForChangeDataSource(dataSources), false);

        const fs = await generateChange<ChangeType.CHANGE_DATA_SOURCE>(basePath, ChangeType.CHANGE_DATA_SOURCE, {
            variant,
            dataSources,
            service: answers
        });

        if (!simulate) {
            await new Promise((resolve) => fs.commit(resolve));
        } else {
            await traceChanges(fs);
        }
    } catch (error) {
        logger.error(error.message);
        if (error.response?.status === 401 && loginAttempts) {
            loginAttempts--;
            logger.error(
                `Authentication failed. Please check your credentials. Login attempts left: ${loginAttempts + 1}`
            );
            await changeDataSource(basePath, simulate, yamlPath);
            return;
        }
        logger.debug(error);
    }
}
