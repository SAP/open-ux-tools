import { join } from 'path';
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
    validateMtaConfig(config);
    if (await fileExists(join(config.mtaPath, config.mtaId), fs)) {
        throw new Error(t('error.mtaFolderAlreadyExists'));
    }
    createMTA(config as MTABaseConfig);
    await addRoutingConfig(config, fs);
    await generateSupportingConfig(config as MTABaseConfig, fs);
    LoggerHelper.logger?.debug(`CF Config ${JSON.stringify(config, null, 2)}`);
    return fs;
}
