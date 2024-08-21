import type { Command } from 'commander';
import { getLogger, traceChanges } from '../../tracing';
import { ChangeType, generateChange, getPromptsForChangeInbound, getVariant } from '@sap-ux/adp-tooling';
import type { DescriptorVariantContent } from '@sap-ux/adp-tooling';
import { promptYUIQuestions } from '../../common';
import { validateAdpProject, validateCloudAdpProject } from '../../validation';

/**
 * Add a new sub-command to change the inbound of an adaptation project to the given command.
 *
 * @param {Command} cmd - The command to add the change inbound sub-command to.
 */
export function addChangeInboundCommand(cmd: Command): void {
    cmd.command('inbound [path]')
        .option('-s, --simulate', 'simulate only do not write or install')
        .action(async (path, options) => {
            await changeInbound(path, !!options.simulate);
        });
}

/**
 * Changes the data source of an adaptation project.
 *
 * @param {string} basePath - The path to the adaptation project.
 * @param {boolean} simulate - If set to true, then no files will be written to the filesystem.
 */
async function changeInbound(basePath: string, simulate: boolean): Promise<void> {
    const logger = getLogger();
    try {
        if (!basePath) {
            basePath = process.cwd();
        }

        await validateAdpProject(basePath);
        validateCloudAdpProject(basePath);
        const variant = getVariant(basePath);
        const change = variant.content.find(
            (change: DescriptorVariantContent) => change.changeType === 'appdescr_app_removeAllInboundsExceptOne'
        );
        const inboundId = change?.content?.inboundId as string;
        const answers = await promptYUIQuestions(getPromptsForChangeInbound(), false);
        const fs = await generateChange<ChangeType.CHANGE_INBOUND>(basePath, ChangeType.CHANGE_INBOUND, {
            inboundId,
            variant,
            flp: answers
        });

        if (!simulate) {
            await new Promise((resolve) => fs.commit(resolve));
        } else {
            await traceChanges(fs);
        }
    } catch (error) {
        logger.error(error?.message);
        logger.debug(error);
    }
}
