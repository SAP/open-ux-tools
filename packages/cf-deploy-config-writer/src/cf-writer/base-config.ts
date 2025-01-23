import { create as createStorage } from 'mem-fs';
import { create, type Editor } from 'mem-fs-editor';
import { addSupportingConfig, addRoutingConfig, setMtaDefaults } from '../utils';
import LoggerHelper from '../logger-helper';
import { createMTA, validateMtaConfig } from '../mta-config';
import { type Logger } from '@sap-ux/logger';
import { type CFBaseConfig, type MTABaseConfig } from '../types';

/**
 * Add a standalone | managed approuter to an empty target folder.
 *
 * @param config writer configuration
 * @param fs an optional reference to a mem-fs editor
 * @param logger optional logger instance
 * @returns file system reference
 */
export async function generateBaseConfig(config: CFBaseConfig, fs?: Editor, logger?: Logger): Promise<Editor> {
    if (!fs) {
        fs = create(createStorage());
    }
    if (logger) {
        LoggerHelper.logger = logger;
    }
    logger?.debug(`Generate base configuration using: \n ${JSON.stringify(config)}`);
    validateMtaConfig(config, fs);
    createMTA(config as MTABaseConfig);
    await addRoutingConfig(config, fs);
    addSupportingConfig(config, fs);
    LoggerHelper.logger?.debug(`CF Config ${JSON.stringify(config, null, 2)}`);
    return fs;
}
