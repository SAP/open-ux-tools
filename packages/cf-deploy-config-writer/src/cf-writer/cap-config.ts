import { create as createStorage } from 'mem-fs';
import { create, type Editor } from 'mem-fs-editor';
import { updateRootPackage } from '../utils';
import { validateMtaConfig, isMTAFound, addRoutingConfig, generateCAPMTA } from '../mta-config';
import { waitForMtaFile } from '../mta-config/wait-for-mta';
import LoggerHelper from '../logger-helper';
import type { Logger } from '@sap-ux/logger';
import { type CAPConfig, type CFBaseConfig } from '../types';
import { t } from '../i18n';
import { getCapProjectType } from '@sap-ux/project-access';

/**
 * Add a standalone | managed approuter to a CAP project.
 *
 * @param config Writer configuration
 * @param fs An optional reference to a mem-fs editor
 * @param logger Optional logger instance
 * @returns File system reference
 * @throws {Error} If target folder does not contain a Node.js CAP project
 * @throws {Error} If mta.yaml already exists in the target directory
 */
export async function generateCAPConfig(config: CAPConfig, fs?: Editor, logger?: Logger): Promise<Editor> {
    fs ??= create(createStorage());
    if (logger) {
        LoggerHelper.logger = logger;
    }
    logger?.debug(`Generate CAP configuration using: \n ${JSON.stringify(config)}`);
    await validateConfig(config);
    await generateCAPMTA(config, fs);
    // Wait until mta.yaml is readable by mta-lib before proceeding
    await waitForMtaFile(config.mtaPath);
    await addRoutingConfig(config, fs);
    await updateRootPackage({ mtaId: config.mtaId, rootPath: config.mtaPath }, fs);
    LoggerHelper.logger?.debug(t('debug.capGenerationCompleted'));
    return fs;
}

/**
 * Ensure the configuration is valid, target folder exists and is a CAP Node.js app and mta.yaml does not already exist.
 *
 * @param config Writer configuration
 * @throws {Error} If target folder does not contain a CAP Node.js project
 * @throws {Error} If mta.yaml already exists in the target directory
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
