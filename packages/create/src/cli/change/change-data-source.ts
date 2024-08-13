import type { Command } from 'commander';
import type { ManifestNamespace } from '@sap-ux/project-access';
import {
    generateChange,
    ChangeType,
    getPromptsForChangeDataSource,
    getAdpConfig,
    getManifestDataSources,
    getVariant,
    type DataSourceData,
    type DescriptorVariant,
    type ChangeDataSourceAnswers
} from '@sap-ux/adp-tooling';
import { getLogger, traceChanges } from '../../tracing';
import { promptYUIQuestions } from '../../common';
import { validateAdpProject } from '../../validation/validation';

let loginAttempts = 3;

/**
 * Add a new sub-command to change the data source of an adaptation project to the given command.
 *
 * @param {Command} cmd - The command to add the change data-source sub-command to.
 */
export function addChangeDataSourceCommand(cmd: Command): void {
    cmd.command('data-source [path]')
        .option('-s, --simulate', 'simulate only do not write or install')
        .option('-c, --config <string>', 'Path to project configuration file in YAML format', 'ui5.yaml')
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
        const variant = getVariant(basePath);
        const adpConfig = await getAdpConfig(basePath, yamlPath);
        const dataSources = await getManifestDataSources(variant.reference, adpConfig, logger);
        const answers = await promptYUIQuestions(getPromptsForChangeDataSource(dataSources), false);

        const fs = await generateChange<ChangeType.CHANGE_DATA_SOURCE>(
            basePath,
            ChangeType.CHANGE_DATA_SOURCE,
            getWriterData(variant, dataSources, answers)
        );

        if (!simulate) {
            await new Promise((resolve) => fs.commit(resolve));
        } else {
            await traceChanges(fs);
        }
    } catch (error) {
        logger.error(error.message);
        if (error.response?.status === 401 && loginAttempts) {
            loginAttempts--;
            logger.error(`Authentication failed. Please check your credentials. Login attempts left: ${loginAttempts}`);
            await changeDataSource(basePath, simulate, yamlPath);
            return;
        }
        logger.debug(error);
    }
}

/**
 * Returns the writer data for the data source change.
 *
 * @param {DescriptorVariant} variant - The variant of the adaptation project.
 * @param {Record<string, ManifestNamespace.DataSource>} dataSources - The data sources of the adaptation project.
 * @param {ChangeDataSourceAnswers} answers - The answers provided by the user.
 * @returns {DataSourceData} The writer data for the data source change.
 */
function getWriterData(
    variant: DescriptorVariant,
    dataSources: Record<string, ManifestNamespace.DataSource>,
    answers: ChangeDataSourceAnswers
): DataSourceData {
    return {
        variant,
        dataSources,
        service: answers
    };
}
