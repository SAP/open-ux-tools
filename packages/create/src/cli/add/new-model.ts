import type { Command } from 'commander';

import { getAppType } from '@sap-ux/project-access';
import { generateChange, ChangeType, getPromptsForNewModel, getVariant, isCFEnvironment } from '@sap-ux/adp-tooling';

import { promptYUIQuestions } from '../../common';
import { getLogger, traceChanges } from '../../tracing';

/**
 * Add a new sub-command to add new odata service and new sapui5 model of an adaptation project to the given command.
 *
 * @param {Command} cmd - The command to add the change data-source sub-command to.
 */
export function addNewModelCommand(cmd: Command): void {
    cmd.command('new-model [path]')
        .option('-s, --simulate', 'simulate only do not write or install')
        .option('-c, --config <string>', 'Path to project configuration file in YAML format', 'ui5.yaml')
        .action(async (path, options) => {
            await addNewModel(path, !!options.simulate, options.config);
        });
}

/**
 * Changes the odata service and new sapui5 model of an adaptation project.
 *
 * @param {string} basePath - The path to the adaptation project.
 * @param {boolean} simulate - If set to true, then no files will be written to the filesystem.
 * @param {string} yamlPath - The path to the project configuration file in YAML format.
 */
async function addNewModel(basePath: string, simulate: boolean, yamlPath: string): Promise<void> {
    const logger = getLogger();
    try {
        if (!basePath) {
            basePath = process.cwd();
        }

        if ((await getAppType(basePath)) !== 'Fiori Adaptation') {
            throw new Error('This command can only be used for an Adaptation Project');
        }

        if (isCFEnvironment(basePath)) {
            throw new Error('Changing data source is not supported for CF projects.');
        }

        const variant = getVariant(basePath);

        const answers = await promptYUIQuestions(getPromptsForNewModel(basePath, variant.layer), false);

        const fs = await generateChange<ChangeType.ADD_NEW_MODEL>(basePath, ChangeType.ADD_NEW_MODEL, {
            variant,
            answers
        });

        if (!simulate) {
            await new Promise((resolve) => fs.commit(resolve));
        } else {
            await traceChanges(fs);
        }
    } catch (error) {
        logger.error(error.message);
        logger.debug(error);
    }
}
