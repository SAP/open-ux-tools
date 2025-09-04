import { join } from 'path';
import { create as createStorage } from 'mem-fs';
import { create, type Editor } from 'mem-fs-editor';

import { getApplicationType } from '../source';
import { getI18nDescription, getI18nModels, writeI18nModels } from './i18n';
import {
    type CfAdpWriterConfig,
    type FlexLayer,
    type CreateCfConfigParams,
    AppRouterType,
    type Content
} from '../types';
import { adjustMtaYaml } from '../cf';
import { fillDescriptorContent } from './manifest';
import { getLatestVersion } from '../ui5/version-info';
import { getCfVariant, writeCfTemplates } from './project-utils';

/**
 * Create CF configuration from batch objects.
 *
 * @param {CreateCfConfigParams} params - The configuration parameters containing batch objects.
 * @returns {CfAdpWriterConfig} The CF configuration.
 */
export function createCfConfig(params: CreateCfConfigParams): CfAdpWriterConfig {
    const baseApp = params.cfServicesAnswers.baseApp;

    if (!baseApp) {
        throw new Error('Base app is required for CF project generation');
    }

    const ui5Version = getLatestVersion(params.publicVersions);

    return {
        app: {
            id: baseApp.appId,
            title: params.attributeAnswers.title,
            layer: params.layer,
            namespace: params.attributeAnswers.namespace,
            manifest: params.manifest
        },
        baseApp,
        cf: {
            url: params.cfConfig.url,
            org: params.cfConfig.org,
            space: params.cfConfig.space,
            html5RepoRuntimeGuid: params.html5RepoRuntimeGuid,
            approuter: params.cfServicesAnswers.approuter ?? AppRouterType.MANAGED,
            businessService: params.cfServicesAnswers.businessService ?? '',
            businessSolutionName: params.cfServicesAnswers.businessSolutionName
        },
        project: {
            name: params.attributeAnswers.projectName,
            path: params.projectPath,
            folder: join(params.projectPath, params.attributeAnswers.projectName)
        },
        ui5: {
            version: ui5Version
        },
        options: {
            addStandaloneApprouter: params.cfServicesAnswers.approuter === AppRouterType.STANDALONE
        }
    };
}

/**
 * Writes the CF adp-project template to the mem-fs-editor instance.
 *
 * @param {string} basePath - The base path.
 * @param {CfAdpWriterConfig} config - The CF writer configuration.
 * @param {Editor} fs - The memfs editor instance.
 * @returns {Promise<Editor>} The updated memfs editor instance.
 */
export async function generateCf(basePath: string, config: CfAdpWriterConfig, fs?: Editor): Promise<Editor> {
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
        cf.space.GUID
    );

    if (fullConfig.app.i18nModels) {
        writeI18nModels(basePath, fullConfig.app.i18nModels, fs);
    }

    const variant = getCfVariant(config);
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
