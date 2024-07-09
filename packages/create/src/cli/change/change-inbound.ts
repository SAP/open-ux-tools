import type { Command } from 'commander';
import { getLogger, traceChanges } from '../../tracing';
import { ChangeType, generateChange, getPromptsForChangeInbound } from '@sap-ux/adp-tooling';
import type { DescriptorVariantContent } from '@sap-ux/adp-tooling';
import { getAppType } from '@sap-ux/project-access';
import { promptYUIQuestions } from '../../common';
import { getVariant } from '../../common/utils';

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

        await validateProject(basePath);
        const variant = getVariant(basePath);
        const change = variant.content.find(
            (change: DescriptorVariantContent) => change.changeType === 'appdescr_app_removeAllInboundsExceptOne'
        );
        const inboundId = change?.content?.inboundId as string;
        const answers = await promptYUIQuestions(getPromptsForChangeInbound(), false);
        const fs = await generateChange<ChangeType.CHANGE_INBOUND>(basePath, ChangeType.CHANGE_INBOUND, {
            answers,
            inboundId,
            variant
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

/**
 * Validate if Adaptation Project is supported for command, throws an error if not supported.
 *
 * @param basePath - path to the Adaptation Project
 */
async function validateProject(basePath: string): Promise<void> {
    if ((await getAppType(basePath)) !== 'Fiori Adaptation') {
        throw new Error('This command can only be used for an Adaptation Project');
    }

    const manifest = getVariant(basePath);
    if (
        !manifest.content.some(
            (change: DescriptorVariantContent) => change.changeType === 'appdescr_app_removeAllInboundsExceptOne'
        )
    ) {
        throw new Error('This command can only be used for Cloud Adaptation Project');
    }
}
