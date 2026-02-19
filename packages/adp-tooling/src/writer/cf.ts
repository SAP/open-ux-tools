import fs from 'node:fs';
import { join } from 'node:path';
import { create as createStorage } from 'mem-fs';
import { create, type Editor } from 'mem-fs-editor';

import { type ToolsLogger } from '@sap-ux/logger';
import { readUi5Yaml } from '@sap-ux/project-access';

import {
    adjustMtaYaml,
    getAppHostIds,
    getOrCreateServiceInstanceKeys,
    addServeStaticMiddleware,
    addBackendProxyMiddleware,
    getCfUi5AppInfo
} from '../cf';
import { getApplicationType } from '../source';
import { fillDescriptorContent } from './manifest';
import type { CfAdpWriterConfig, Content, CfUi5AppInfo, CfConfig } from '../types';
import { getCfVariant, writeCfTemplates, writeCfUI5Yaml } from './project-utils';
import { getI18nDescription, getI18nModels, writeI18nModels } from './i18n';
import { getBaseAppId } from '../base/helper';
import { runBuild } from '../base/project-builder';

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

    const fullConfig = setDefaults(config);
    const { app, cf, ui5, project } = fullConfig;

    await adjustMtaYaml(
        {
            projectPath: basePath,
            adpProjectName: project.name,
            appRouterType: cf.approuter,
            businessSolutionName: cf.businessSolutionName ?? '',
            businessService: cf.businessService,
            serviceKeys: cf.serviceInfo?.serviceKeys,
            spaceGuid: cf.space.GUID
        },
        fs,
        config.options?.templatePathOverwrite,
        logger
    );

    if (fullConfig.app.i18nModels) {
        writeI18nModels(basePath, fullConfig.app.i18nModels, fs);
    }

    const variant = getCfVariant(fullConfig);
    fillDescriptorContent(variant.content as Content[], app.appType, ui5.version, app.i18nModels);

    await writeCfTemplates(basePath, variant, fullConfig, fs);
    await writeCfUI5Yaml(fullConfig.project.folder, fullConfig, fs);

    return fs;
}

/**
 * Set default values for CF configuration.
 *
 * @param {CfAdpWriterConfig} config - The CF configuration provided by the calling middleware.
 * @returns {CfAdpWriterConfig} The enhanced configuration with default values.
 */
function setDefaults(config: CfAdpWriterConfig): CfAdpWriterConfig {
    const configWithDefaults: CfAdpWriterConfig = {
        ...config,
        app: {
            ...config.app,
            appType: config.app.appType ?? getApplicationType(config.app.manifest),
            i18nModels: config.app.i18nModels ?? getI18nModels(config.app.manifest, config.app.layer, config.app.id),
            i18nDescription: config.app.i18nDescription ?? getI18nDescription(config.app.layer, config.app.title)
        },
        options: {
            addStandaloneApprouter: false,
            addSecurity: false,
            ...config.options
        }
    };

    return configWithDefaults;
}

/**
 * Fetch ui5AppInfo.json and write it to the project root.
 *
 * @param basePath - path to application root
 * @param ui5AppInfo - ui5AppInfo.json content
 * @param logger - logger instance
 */
export async function writeUi5AppInfo(basePath: string, ui5AppInfo: CfUi5AppInfo, logger?: ToolsLogger): Promise<void> {
    try {
        const ui5AppInfoTargetPath = join(basePath, 'ui5AppInfo.json');
        fs.writeFileSync(ui5AppInfoTargetPath, JSON.stringify(ui5AppInfo, null, 2), 'utf-8');
        logger?.info(`Written ui5AppInfo.json to ${basePath}`);
    } catch (error) {
        logger?.error(`Failed to process ui5AppInfo.json: ${(error as Error).message}`);
        throw error;
    }
}

/**
 * Generate CF configuration for an adaptation project.
 *
 * @param basePath - path to project root
 * @param yamlPath - path to the project configuration file in YAML format
 * @param cfConfig - CF configuration
 * @param logger - logger instance
 * @param fs - mem-fs editor instance
 * @returns updated mem-fs editor instance
 */
export async function generateCfConfig(
    basePath: string,
    yamlPath: string,
    cfConfig: CfConfig,
    logger?: ToolsLogger,
    fs?: Editor
): Promise<Editor> {
    fs ??= create(createStorage());

    const ui5Config = await readUi5Yaml(basePath, yamlPath);

    const bundlerTask = ui5Config.findCustomTask<{ space?: string; serviceInstanceName?: string }>(
        'app-variant-bundler-build'
    );
    const serviceInstanceName = bundlerTask?.configuration?.serviceInstanceName;
    if (!serviceInstanceName) {
        throw new Error('No serviceInstanceName found in app-variant-bundler-build configuration');
    }

    const serviceInfo = await getOrCreateServiceInstanceKeys(
        {
            names: [serviceInstanceName],
            spaceGuids: [bundlerTask?.configuration?.space ?? '']
        },
        logger
    );

    if (!serviceInfo || serviceInfo.serviceKeys.length === 0) {
        throw new Error(`No service keys found for service instance: ${serviceInstanceName}`);
    }

    const appId = await getBaseAppId(basePath);
    const appHostIds = getAppHostIds(serviceInfo.serviceKeys);
    const ui5AppInfo: CfUi5AppInfo = await getCfUi5AppInfo(appId, appHostIds, cfConfig, logger);

    if (appHostIds.length === 0) {
        throw new Error('No app host IDs found in service keys.');
    }

    await writeUi5AppInfo(basePath, ui5AppInfo, logger);
    await addServeStaticMiddleware(basePath, ui5Config, logger);
    await runBuild(basePath, { ADP_BUILDER_MODE: 'preview' });
    addBackendProxyMiddleware(basePath, ui5Config, serviceInfo.serviceKeys, logger);

    fs.write(join(basePath, yamlPath), ui5Config.toString());
    return fs;
}
