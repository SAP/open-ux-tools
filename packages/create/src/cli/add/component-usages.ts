import type { Command } from 'commander';
import {
    generateChange,
    getVariant,
    ChangeType,
    getPromptsForAddComponentUsages,
    type ComponentUsagesData,
    type AddComponentUsageAnswers,
    DescriptorVariant
} from '@sap-ux/adp-tooling';
import { getLogger, traceChanges } from '../../tracing';
import { validateAdpProject } from '../../validation/validation';
import { promptYUIQuestions } from '../../common';
import { get } from 'http';

/**
 * Add a new sub-command to add component usages of an adaptation project to the given command.
 *
 * @param {Command} cmd - The command to add the add component-usages sub-command to.
 */
export function addComponentUsagesCommand(cmd: Command): void {
    cmd.command('component-usages [path]')
        .option('-s, --simulate', 'simulate only do not write or install')
        .action(async (path, options) => {
            await addComponentUsages(path, !!options.simulate);
        });
}

/**
 * Adds component usages to the adaptation project.
 *
 * @param {string} basePath - The path to the adaptation project.
 * @param {boolean} simulate - If set to true, then no files will be written to the filesystem.
 */
export async function addComponentUsages(basePath: string, simulate: boolean): Promise<void> {
    const logger = getLogger();
    try {
        if (!basePath) {
            basePath = process.cwd();
        }
        await validateAdpProject(basePath);

        const variant = getVariant(basePath);

        const answers = await promptYUIQuestions(getPromptsForAddComponentUsages(basePath, variant.layer), false);

        const fs = await generateChange<ChangeType.ADD_COMPONENT_USAGES>(
            basePath,
            ChangeType.ADD_COMPONENT_USAGES,
            getWriterData(variant, answers)
        );

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

/**
 * Returns the writer data for the component usages change.
 *
 * @param {string} variant - The variant of the adaptation project.
 * @param {AddComponentUsageAnswers} answers - The answers object containing the information needed to construct the writer data.
 * @returns {ComponentUsagesData} The writer data for the component usages change.
 */
function getWriterData(variant: DescriptorVariant, answers: AddComponentUsageAnswers): ComponentUsagesData {
    const { id, data, settings, isLazy, name, library, libraryIsLazy, shouldAddLibrary } = answers;

    return {
        variant,
        component: {
            data,
            usageId: id,
            settings,
            isLazy,
            name
        },
        ...(shouldAddLibrary && {
            library: {
                reference: library as string,
                referenceIsLazy: libraryIsLazy as string
            }
        })
    };
}
