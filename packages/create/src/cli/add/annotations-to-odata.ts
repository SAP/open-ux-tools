import type { Command } from 'commander';
import {
    generateChange,
    ChangeType,
    getPromptsForAddAnnotationsToOData,
    getAdpConfig,
    ManifestService,
    getVariant
} from '@sap-ux/adp-tooling';
import { createAbapServiceProvider } from '@sap-ux/system-access';
import { getAnnotationNamespaces, type NamespaceAlias } from '@sap-ux/odata-service-writer';

import { promptYUIQuestions } from '../../common';
import { getLogger, traceChanges } from '../../tracing';
import { validateAdpProject } from '../../validation/validation';

let loginAttempts = 3;

/**
 * Add a new sub-command to add annotations to odata service of an adaptation project to the given command.
 *
 * @param {Command} cmd - The command to add the add annotations-to-odata sub-command to.
 */
export function addAnnotationsToOdataCommand(cmd: Command): void {
    cmd.command('annotations [path]')
        .option('-s, --simulate', 'simulate only do not write or install')
        .option('-c, --config <string>', 'Path to project configuration file in YAML format', 'ui5.yaml')
        .action(async (path, options) => {
            await addAnnotationsToOdata(path, !!options.simulate, options.config);
        });
}

/**
 * Changes the data source of an adaptation project.
 *
 * @param {string} basePath - The path to the adaptation project.
 * @param {boolean} simulate - If set to true, then no files will be written to the filesystem.
 * @param {string} yamlPath - The path to the project configuration file in YAML format.
 */
async function addAnnotationsToOdata(basePath: string, simulate: boolean, yamlPath: string): Promise<void> {
    const logger = getLogger();
    try {
        if (!basePath) {
            basePath = process.cwd();
        }
        await validateAdpProject(basePath);
        const variant = getVariant(basePath);
        const { target, ignoreCertErrors = false } = await getAdpConfig(basePath, yamlPath);
        const provider = await createAbapServiceProvider(
            target,
            {
                ignoreCertErrors
            },
            true,
            logger
        );
        const manifestService = await ManifestService.initMergedManifest(provider, basePath, variant, logger);
        const dataSources = manifestService.getManifestDataSources();
        const answers = await promptYUIQuestions(getPromptsForAddAnnotationsToOData(basePath, dataSources), false);
        let namespaces: NamespaceAlias[] = [];
        if (!answers.filePath) {
            const metadata = await manifestService.getDataSourceMetadata(answers.id);
            namespaces = getAnnotationNamespaces({ metadata });
        }

        const fs = await generateChange<ChangeType.ADD_ANNOTATIONS_TO_ODATA>(
            basePath,
            ChangeType.ADD_ANNOTATIONS_TO_ODATA,
            {
                variant,
                annotation: {
                    dataSource: answers.id,
                    filePath: answers.filePath,
                    namespaces,
                    serviceUrl: dataSources[answers.id].uri
                }
            }
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
            logger.error(
                `Authentication failed. Please check your credentials. Login attempts left: ${loginAttempts + 1}`
            );
            await addAnnotationsToOdata(basePath, simulate, yamlPath);
            return;
        }
        logger.debug(error);
    }
}
