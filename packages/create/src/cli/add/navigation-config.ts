import type { Command } from 'commander';
import { create as createStorage } from 'mem-fs';
import { create, type Editor } from 'mem-fs-editor';
import { FLPConfigAnswers, getPrompts } from '@sap-ux/flp-config-inquirer';
import { generateInboundNavigationConfig, readManifest } from '@sap-ux/app-config-writer';

import { promptYUIQuestions } from '../../common';
import { validateBasePath } from '../../validation';
import { getLogger, traceChanges, setLogLevelVerbose } from '../../tracing';
import { ManifestNamespace } from '@sap-ux/project-access';

/**
 * Add the "add inbound-navigation" command to a passed command.
 *
 * @param cmd - commander command for adding navigation inbounds config command
 */
export function addInboundNavigationConfigCommand(cmd: Command): void {
    cmd.command('inbound-navigation [path]')
        .option('-s, --simulate', 'simulate only do not write config; sets also --verbose')
        .option('-v, --verbose', 'show verbose information')
        .action(async (path, options) => {
            if (options.verbose === true || options.simulate) {
                setLogLevelVerbose();
            }
            await addInboundNavigationConfig(path || process.cwd(), !!options.simulate);
        });
}

/**
 * Adds an inbound navigation config to an app. To prevent overwriting existing inbounds will be checked.
 *
 * @param basePath - path to application root
 * @param simulate - if true, do not write but just show what would be changed; otherwise write
 */
async function addInboundNavigationConfig(basePath: string, simulate: boolean): Promise<void> {
    const logger = getLogger();
    try {
        logger.debug(`Called add inbound navigation-config for path '${basePath}', simulate is '${simulate}'`);
        await validateBasePath(basePath);

        const fs = create(createStorage());

        const { manifest } = await readManifest(basePath, fs);

        const inbounds = manifest?.['sap.app']?.crossNavigation?.inbounds;

        const config = await getUserConfig(inbounds);

        if (!config) {
            logger.info('User chose not to overwrite existing inbound navigation configuration.');
            return;
        }

        await generateInboundNavigationConfig(basePath, config, true, fs);

        if (!simulate) {
            fs.commit(() => logger.info(`Inbound navigation configuration complete.`));
        } else {
            await traceChanges(fs);
        }
    } catch (error) {
        logger.error(`Error while executing add inbound navigation configuration '${(error as Error).message}'`);
        logger.debug(error as Error);
    }
}

/**
 * Prompts the user for inbound navigation configuration.
 *
 * @param inbounds - The existing inbounds to avoid conflicts.
 * @returns {Promise<FLPConfigAnswers | undefined>} The user-provided configuration or undefined if skipped.
 */
async function getUserConfig(inbounds: ManifestNamespace.Inbound | undefined): Promise<FLPConfigAnswers | undefined> {
    const config = await promptYUIQuestions(await getPrompts(Object.keys(inbounds ?? {})), false);

    if (config?.subTitle === '') {
        config.subTitle = undefined;
    }

    return config?.overwrite === false ? undefined : config;
}
