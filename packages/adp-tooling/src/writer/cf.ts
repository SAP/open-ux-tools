import { join } from 'node:path';
import { create as createStorage } from 'mem-fs';
import { create, type Editor } from 'mem-fs-editor';

import { type ToolsLogger } from '@sap-ux/logger';
import { readUi5Yaml } from '@sap-ux/project-access';

import {
    adjustMtaYaml,
    getOrCreateServiceInstanceKeys,
    addServeStaticMiddleware,
    addBackendProxyMiddleware,
    getProjectNameForXsSecurity
} from '../cf';
import { getApplicationType } from '../source';
import { fillDescriptorContent } from './manifest';
import type { CfAdpWriterConfig, Content, CfConfig } from '../types';
import { getCfVariant, writeCfTemplates, writeCfUI5Yaml } from './project-utils';
import { getI18nDescription, getI18nModels, writeI18nModels } from './i18n';
import { runBuild } from '../base/project-builder';
import { downloadUi5AppInfo } from '../cf/project/ui5-app-info';

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

    const timestamp = Date.now().toString();

    const fullConfig = setDefaults(config);
    const { app, cf, ui5, project } = fullConfig;

    const yamlContent = await adjustMtaYaml(
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
        timestamp,
        config.options?.templatePathOverwrite,
        logger
    );

    if (fullConfig.app.i18nModels) {
        writeI18nModels(basePath, fullConfig.app.i18nModels, fs);
    }

    const variant = getCfVariant(fullConfig);
    fillDescriptorContent(variant.content as Content[], app.appType, ui5.version, app.i18nModels);

    fullConfig.project.xsSecurityAppName = getProjectNameForXsSecurity(yamlContent, timestamp);
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

    await downloadUi5AppInfo(basePath, cfConfig, logger);
    await addServeStaticMiddleware(basePath, ui5Config, logger);
    await runBuild(basePath, { ADP_BUILDER_MODE: 'preview' });
    addBackendProxyMiddleware(basePath, ui5Config, serviceInfo.serviceKeys, logger);

    fs.write(join(basePath, yamlPath), ui5Config.toString());
    return fs;
}
