import { join } from 'path';
import type { Command } from 'commander';
import { create as createStorage } from 'mem-fs';
import { create, type Editor } from 'mem-fs-editor';

import {
    flpConfigurationExists,
    generateInboundConfig,
    getAdpConfig,
    getInboundsFromManifest,
    getRegistrationIdFromManifest,
    getVariant,
    ManifestService
} from '@sap-ux/adp-tooling';
import type { ToolsLogger } from '@sap-ux/logger';
import { getPrompts } from '@sap-ux/flp-config-inquirer';
import { FileName, getAppType } from '@sap-ux/project-access';
import { createAbapServiceProvider } from '@sap-ux/system-access';
import type { InternalInboundNavigation } from '@sap-ux/adp-tooling';
import type { Manifest, ManifestNamespace } from '@sap-ux/project-access';
import { TenantType, type AbapServiceProvider } from '@sap-ux/axios-extension';
import { generateInboundNavigationConfig, readManifest } from '@sap-ux/app-config-writer';
import type { FLPConfigAnswers, FLPConfigPromptOptions } from '@sap-ux/flp-config-inquirer';

import { promptYUIQuestions } from '../../common';
import { validateBasePath } from '../../validation';
import { filterLabelTypeQuestions } from '../../common/prompts';
import { getLogger, traceChanges, setLogLevelVerbose } from '../../tracing';

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
 * Adds an inbound navigation configuration to an app. Checks existing inbounds to prevent overwriting.
 *
 * @param {string} basePath - The path to the application root.
 * @param {boolean} simulate - If true, simulates the changes without writing them; otherwise, writes changes.
 * @returns {Promise<void>} A promise that resolves when the operation is complete.
 */
async function addInboundNavigationConfig(basePath: string, simulate: boolean): Promise<void> {
    const logger = getLogger();
    try {
        logger.debug(`Called add inbound navigation-config for path '${basePath}', simulate is '${simulate}'`);
        await validateBasePath(basePath);

        const appType = await getAppType(basePath);
        const isAdp = appType === 'Fiori Adaptation';

        if (isAdp && flpConfigurationExists(basePath)) {
            logger.info('FLP Configuration already exists.');
            return;
        }

        const fs = create(createStorage());

        const manifest = await getManifest(basePath, isAdp, fs, logger);
        const inbounds = getInboundsFromManifest(manifest);
        const appId = getRegistrationIdFromManifest(manifest);

        const config = await getUserConfig(inbounds, isAdp, appId);

        if (!config) {
            logger.info('User chose not to overwrite existing inbound navigation configuration.');
            return;
        }

        if (isAdp) {
            await generateInboundConfig(basePath, config as InternalInboundNavigation, fs);
        } else {
            await generateInboundNavigationConfig(basePath, config, true, fs);
        }

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
 * Retrieves the project's manifest.
 *
 * @param {string} basePath - The base path to the project.
 * @param {boolean} isAdp - Indicates whether the project is an ADP project.
 * @param {Editor} fs - The mem-fs editor instance.
 * @param {ToolsLogger} logger - The logger instance.
 * @returns {Promise<Manifest>} A promise that resolves to the manifest.
 */
async function getManifest(basePath: string, isAdp: boolean, fs: Editor, logger: ToolsLogger): Promise<Manifest> {
    let manifest: Manifest;
    if (!isAdp) {
        manifest = (await readManifest(basePath, fs))?.manifest;
    } else {
        const variant = getVariant(basePath);
        const { target, ignoreCertErrors = false } = await getAdpConfig(basePath, join(basePath, FileName.Ui5Yaml));
        const provider = await createAbapServiceProvider(
            target,
            {
                ignoreCertErrors
            },
            true,
            logger
        );

        if (!(await isCloudReady(provider))) {
            throw new Error('Command is only available for CloudReady applications.');
        }

        const manifestService = await ManifestService.initMergedManifest(provider, basePath, variant, logger);

        manifest = manifestService.getManifest();
    }

    return manifest;
}

/**
 * Determines whether the given ABAP service provider indicates a CloudReady application.
 *
 * @param {AbapServiceProvider} provider - The ABAP service provider instance used to fetch ATO settings.
 * @returns {Promise<boolean>} A promise that resolves to `true` if the application is CloudReady, otherwise `false`.
 */
async function isCloudReady(provider: AbapServiceProvider): Promise<boolean> {
    const atoSettings = await provider.getAtoInfo();
    return atoSettings.tenantType === TenantType.Customer && atoSettings.operationsType === 'C';
}

/**
 * Prompts the user for inbound navigation configuration.
 *
 * @param {ManifestNamespace.Inbound | undefined} inbounds - The existing inbounds if any.
 * @param {boolean} isAdp - Indicates whether the project is an ADP project.
 * @param {string} [appId] - The application ID used for generating prompts specific to the app.
 * @returns {Promise<FLPConfigAnswers | undefined>} A promise resolving to the user-provided configuration,
 * or `undefined` if the user opts not to overwrite.
 */
async function getUserConfig(
    inbounds: ManifestNamespace.Inbound | undefined,
    isAdp: boolean,
    appId?: string
): Promise<FLPConfigAnswers | undefined> {
    let promptOptions: FLPConfigPromptOptions;

    if (!isAdp) {
        promptOptions = {
            inboundId: { hide: true },
            parameterString: { hide: true },
            createAnotherInbound: { hide: true },
            emptyInboundsInfo: { hide: true }
        };
    } else {
        promptOptions = { overwrite: { hide: true }, createAnotherInbound: { hide: true } };
    }

    const prompts = await filterLabelTypeQuestions<FLPConfigAnswers>(await getPrompts(inbounds, appId, promptOptions));
    const config = await promptYUIQuestions(prompts, false);

    if (config?.subTitle === '') {
        config.subTitle = undefined;
    }

    return config?.overwrite === false ? undefined : config;
}
