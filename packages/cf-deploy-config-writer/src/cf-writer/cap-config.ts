import { create as createStorage } from 'mem-fs';
import { create, type Editor } from 'mem-fs-editor';
import { addSupportingConfig, addRoutingConfig } from '../utils';
import { createCAPMTA, validateMtaConfig, isMTAFound } from '../mta-config';
import LoggerHelper from '../logger-helper';
import type { Logger } from '@sap-ux/logger';
import type { CAPConfig, CFBaseConfig } from '../types';
import { CDSDestinationService, CDSHTML5RepoService, CDSXSUAAService } from '../constants';
import { t } from '../i18n';
import { getCapProjectType } from '@sap-ux/project-access';

/**
 * Add a standalone | managed approuter to a CAP project.
 *
 * @param config writer configuration
 * @param fs an optional reference to a mem-fs editor
 * @param logger optional logger instance
 * @returns file system reference
 */
export async function generateCAPConfig(config: CAPConfig, fs?: Editor, logger?: Logger): Promise<Editor> {
    if (!fs) {
        fs = create(createStorage());
    }
    if (logger) {
        LoggerHelper.logger = logger;
    }
    logger?.debug(`Generate CAP configuration using: \n ${JSON.stringify(config)}`);
    await validateConfig(config);
    const cdsOptionalParams: string[] = [CDSXSUAAService, CDSDestinationService, CDSHTML5RepoService];
    createCAPMTA(config.mtaPath, cdsOptionalParams);
    await addRoutingConfig(config, fs);
    addSupportingConfig(config, fs);
    LoggerHelper.logger?.debug(`CF CAP Config ${JSON.stringify(config, null, 2)}`);
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
