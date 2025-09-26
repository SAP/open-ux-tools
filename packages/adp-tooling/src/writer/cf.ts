import { create as createStorage } from 'mem-fs';
import { create, type Editor } from 'mem-fs-editor';

import { type ToolsLogger } from '@sap-ux/logger';

import { adjustMtaYaml } from '../cf';
import { getApplicationType } from '../source';
import { fillDescriptorContent } from './manifest';
import { getCfVariant, writeCfTemplates } from './project-utils';
import { getI18nDescription, getI18nModels, writeI18nModels } from './i18n';
import { type CfAdpWriterConfig, type FlexLayer, type Content } from '../types';

/**
 * Writes the CF adp-project template to the mem-fs-editor instance.
 *
 * @param {string} basePath - The base path.
 * @param {CfAdpWriterConfig} config - The CF writer configuration.
 * @param {ToolsLogger} logger - The logger.
 * @param {Editor} fs - The memfs editor instance.
 * @returns {Promise<Editor>} The updated memfs editor instance.
 */
export async function generateCf(
    basePath: string,
    config: CfAdpWriterConfig,
    logger?: ToolsLogger,
    fs?: Editor
): Promise<Editor> {
    if (!fs) {
        fs = create(createStorage());
    }

    const fullConfig = setDefaultsCF(config);
    const { app, cf, ui5 } = fullConfig;

    await adjustMtaYaml(
        basePath,
        app.id,
        cf.approuter,
        cf.businessSolutionName ?? '',
        cf.businessService,
        cf.space.GUID,
        fs,
        logger
    );

    if (fullConfig.app.i18nModels) {
        writeI18nModels(basePath, fullConfig.app.i18nModels, fs);
    }

    const variant = getCfVariant(fullConfig);
    fillDescriptorContent(variant.content as Content[], app.appType, ui5.version, app.i18nModels);

    await writeCfTemplates(basePath, variant, fullConfig, fs);

    return fs;
}

/**
 * Set default values for CF configuration.
 *
 * @param {CfAdpWriterConfig} config - The CF configuration provided by the calling middleware.
 * @returns {CfAdpWriterConfig} The enhanced configuration with default values.
 */
function setDefaultsCF(config: CfAdpWriterConfig): CfAdpWriterConfig {
    const configWithDefaults: CfAdpWriterConfig = {
        ...config,
        app: {
            ...config.app,
            appType: config.app.appType ?? getApplicationType(config.app.manifest),
            i18nModels: config.app.i18nModels ?? getI18nModels(config.app.manifest, config.app.layer, config.app.id),
            i18nDescription:
                config.app.i18nDescription ?? getI18nDescription(config.app.layer as FlexLayer, config.app.title)
        },
        options: {
            addStandaloneApprouter: false,
            addSecurity: false,
            ...config.options
        }
    };

    return configWithDefaults;
}
