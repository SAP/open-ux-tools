import { create as createStorage } from 'mem-fs';
import { create, type Editor } from 'mem-fs-editor';
import { runNpmInstall, updateRootPackage } from '../utils';
import { validateMtaConfig, isMTAFound, addRoutingConfig, generateCAPMTA } from '../mta-config';
import LoggerHelper from '../logger-helper';
import type { Logger } from '@sap-ux/logger';
import { type CAPConfig, type CFBaseConfig } from '../types';
import { t } from '../i18n';
import { getCapProjectType } from '@sap-ux/project-access';

/**
 * Add a standalone | managed approuter to a CAP project.
 *
 * @param config writer configuration
 * @param fs an optional reference to a mem-fs editor
 * @param logger optional logger instance
 * @param skipInstall skip install of node modules
 * @returns file system reference
 */
export async function generateCAPConfig(
    config: CAPConfig,
    fs?: Editor,
    logger?: Logger,
    skipInstall = false
): Promise<Editor> {
    if (!fs) {
        fs = create(createStorage());
    }
    if (logger) {
        LoggerHelper.logger = logger;
    }
    logger?.debug(`Generate CAP configuration using: \n ${JSON.stringify(config)}`);
    await validateConfig(config);
    await generateCAPMTA(config, fs);
    // Delay, known issues with loading mta yaml after generation!
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await addRoutingConfig(config, fs);
    await updateRootPackage({ mtaId: config.mtaId, rootPath: config.mtaPath }, fs);
    if (!skipInstall) {
        await runNpmInstall(config.mtaPath, fs);
    }
    LoggerHelper.logger?.debug(t('debug.capGenerationCompleted'));
    return fs;
}

/**
 * Ensure the configuration is valid, target folder exists and is a CAP Node.js app and mta.yaml does not already exist.
 *
 * @param config writer configuration
 */
async function validateConfig(config: CAPConfig): Promise<void> {
    validateMtaConfig(config as CFBaseConfig);
    // Check if the target directory contains a CAP Node.js project or exists!
    if ((await getCapProjectType(config.mtaPath)) !== 'CAPNodejs') {
        throw new Error(t('error.doesNotContainACapApp'));
    }
    // Check if the target directory contains an existing mta.yaml
    if (isMTAFound(config.mtaPath)) {
        throw new Error(t('error.mtaAlreadyExists'));
    }
}
