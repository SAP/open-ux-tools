import { join } from 'node:path';
import { create as createStorage } from 'mem-fs';
import { create, type Editor } from 'mem-fs-editor';
import { type Logger } from '@sap-ux/logger';
import { generateSupportingConfig, fileExists } from '../utils';
import LoggerHelper from '../logger-helper';
import { createMTA, validateMtaConfig, addRoutingConfig } from '../mta-config';
import { type CFBaseConfig, type MTABaseConfig } from '../types';
import { t } from '../i18n';

/**
 * Add a standalone | managed | frontend app router to an empty target folder.
 *
 * @param config Writer configuration
 * @param fs An optional reference to a mem-fs editor
 * @param logger Optional logger instance
 * @returns File system reference
 * @throws {Error} If MTA binary is not found, configuration is invalid, or mta.yaml already exists
 */
export async function generateBaseConfig(config: CFBaseConfig, fs?: Editor, logger?: Logger): Promise<Editor> {
    fs ??= create(createStorage());
    if (logger) {
        LoggerHelper.logger = logger;
    }
    logger?.debug(`Generate base configuration using: \n ${JSON.stringify(config)}`);
    validateMtaConfig(config);
    // Check if mta.yaml already exists in the target directory
    if (fileExists(fs, join(config.mtaPath, config.mtaId))) {
        throw new Error(t('error.mtaAlreadyExists'));
    }
    createMTA(config as MTABaseConfig);
    await addRoutingConfig(config, fs);
    await generateSupportingConfig(config as MTABaseConfig, fs);
    LoggerHelper.logger?.debug(`CF Config ${JSON.stringify(config, null, 2)}`);
    return fs;
}
