import { join } from 'path';
import { create as createStorage } from 'mem-fs';
import { create, type Editor } from 'mem-fs-editor';

import { getApplicationType } from '../source';
import { getI18nDescription, getI18nModels, writeI18nModels } from './i18n';
import {
    type CfAdpWriterConfig,
    type FlexLayer,
    ApplicationType,
    type CreateCfConfigParams,
    AppRouterType,
    type DescriptorVariant,
    type Content
} from '../types';
import { YamlUtils } from '../cf/project/yaml';
import { fillDescriptorContent } from './manifest';
import { getLatestVersion } from '../ui5/version-info';

const baseTmplPath = join(__dirname, '../../templates');

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

    const { app, cf } = fullConfig;
    await YamlUtils.adjustMtaYaml(basePath, app.id, cf.approuter, cf.businessSolutionName ?? '', cf.businessService);

    if (fullConfig.app.i18nModels) {
        writeI18nModels(basePath, fullConfig.app.i18nModels, fs);
    }

    await writeCfTemplates(basePath, fullConfig, fs);

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

/**
 * Write CF-specific templates and configuration files.
 *
 * @param {string} basePath - The base path.
 * @param {CfAdpWriterConfig} config - The CF configuration.
 * @param {Editor} fs - The memfs editor instance.
 */
async function writeCfTemplates(basePath: string, config: CfAdpWriterConfig, fs: Editor): Promise<void> {
    const { app, baseApp, cf, project, ui5, options } = config;

    const variant: DescriptorVariant = {
        layer: app.layer,
        reference: app.id,
        id: app.namespace,
        namespace: 'apps/' + app.id + '/appVariants/' + app.namespace + '/',
        content: [
            {
                changeType: 'appdescr_ui5_setMinUI5Version',
                content: {
                    minUI5Version: ui5.version
                }
            },
            {
                changeType: 'appdescr_app_setTitle',
                content: {},
                texts: {
                    i18n: 'i18n/i18n.properties'
                }
            }
        ]
    };

    fillDescriptorContent(variant.content as Content[], app.appType, ui5.version, app.i18nModels);

    fs.copyTpl(
        join(baseTmplPath, 'project/webapp/manifest.appdescr_variant'),
        join(project.folder, 'webapp', 'manifest.appdescr_variant'),
        { app: variant }
    );

    fs.copyTpl(join(baseTmplPath, 'cf/package.json'), join(basePath, project.folder, 'package.json'), {
        module: project.name
    });

    fs.copyTpl(join(baseTmplPath, 'cf/ui5.yaml'), join(basePath, project.folder, 'ui5.yaml'), {
        appHostId: baseApp.appHostId,
        appName: baseApp.appName,
        appVersion: baseApp.appVersion,
        module: project.name,
        html5RepoRuntime: cf.html5RepoRuntimeGuid,
        org: cf.org.GUID,
        space: cf.space.GUID,
        sapCloudService: cf.businessSolutionName ?? ''
    });

    const configJson = {
        componentname: app.namespace,
        appvariant: project.name,
        layer: app.layer,
        isOVPApp: app.appType === ApplicationType.FIORI_ELEMENTS_OVP,
        isFioriElement: app.appType === ApplicationType.FIORI_ELEMENTS,
        environment: 'CF',
        ui5Version: ui5.version,
        cfApiUrl: cf.url,
        cfSpace: cf.space.GUID,
        cfOrganization: cf.org.GUID
    };

    fs.writeJSON(join(basePath, project.folder, '.adp/config.json'), configJson);

    fs.copyTpl(
        join(baseTmplPath, 'cf/i18n/i18n.properties'),
        join(basePath, project.folder, 'webapp/i18n/i18n.properties'),
        {
            module: project.name,
            moduleTitle: app.title,
            appVariantId: app.namespace,
            i18nGuid: config.app.i18nDescription
        }
    );

    fs.copy(join(baseTmplPath, 'cf/_gitignore'), join(basePath, project.folder, '.gitignore'));

    if (options?.addStandaloneApprouter) {
        fs.copyTpl(
            join(baseTmplPath, 'cf/approuter/package.json'),
            join(basePath, `${project.name}-approuter/package.json`),
            {
                projectName: project.name
            }
        );

        fs.copyTpl(
            join(baseTmplPath, 'cf/approuter/xs-app.json'),
            join(basePath, `${project.name}-approuter/xs-app.json`),
            {}
        );
    }

    if (!fs.exists(join(basePath, 'xs-security.json'))) {
        fs.copyTpl(join(baseTmplPath, 'cf/xs-security.json'), join(basePath, 'xs-security.json'), {
            projectName: project.name
        });
    }
}
