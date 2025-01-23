import { create as createStorage } from 'mem-fs';
import { create, type Editor } from 'mem-fs-editor';
import { addSupportingConfig, addRoutingConfig, setMtaDefaults } from '../utils';
import { createCAPMTA, doesMTABinaryExist, validateMtaConfig } from '../mta-config';
import LoggerHelper from '../logger-helper';
import type { Logger } from '@sap-ux/logger';
import type { CAPConfig, CFBaseConfig } from '../types';
import { CDSDestinationService, CDSHTML5RepoService, CDSXSUAAService } from '../constants';

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
    validateMtaConfig(config as CFBaseConfig, fs);
    const cdsOptionalParams: string[] = [CDSXSUAAService, CDSDestinationService, CDSHTML5RepoService];
    createCAPMTA(config.mtaPath, cdsOptionalParams);
    await addRoutingConfig(config, fs);
    addSupportingConfig(config, fs);
    LoggerHelper.logger?.debug(`CF CAP Config ${JSON.stringify(config, null, 2)}`);
    return fs;
}
