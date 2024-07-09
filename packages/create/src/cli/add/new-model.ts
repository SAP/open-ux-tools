import type { Command } from 'commander';

import { generateChange, ChangeType, getPromptsForNewModel, getVariant } from '@sap-ux/adp-tooling';

import { promptYUIQuestions } from '../../common';
import { getLogger, traceChanges } from '../../tracing';
import { validateAdpProject } from '../../validation/validation';

/**
 * Add a new sub-command to add new odata service and new sapui5 model of an adaptation project to the given command.
 *
 * @param {Command} cmd - The command to add the change data-source sub-command to.
 */
export function addNewModelCommand(cmd: Command): void {
    cmd.command('new-model [path]')
        .option('-s, --simulate', 'simulate only do not write or install')
        .action(async (path, options) => {
            await addNewModel(path, !!options.simulate);
        });
}

/**
 * Changes the odata service and new sapui5 model of an adaptation project.
 *
 * @param {string} basePath - The path to the adaptation project.
 * @param {boolean} simulate - If set to true, then no files will be written to the filesystem.
 */
async function addNewModel(basePath: string, simulate: boolean): Promise<void> {
    const logger = getLogger();
    try {
        if (!basePath) {
            basePath = process.cwd();
        }

        await validateAdpProject(basePath);

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
