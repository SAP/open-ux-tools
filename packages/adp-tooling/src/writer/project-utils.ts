import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import { v4 as uuidv4 } from 'uuid';
import type { Editor } from 'mem-fs-editor';
import {
    type CloudApp,
    type AdpWriterConfig,
    type CustomConfig,
    type TypesConfig,
    type CfAdpWriterConfig,
    type DescriptorVariant,
    ApplicationType
} from '../types';
import {
    enhanceUI5DeployYaml,
    enhanceUI5Yaml,
    hasDeployConfig,
    enhanceUI5YamlWithCustomConfig,
    enhanceUI5YamlWithCustomTask,
    enhanceUI5YamlWithTranspileMiddleware
} from './options';

import type { Package } from '@sap-ux/project-access';
import type { OperationsType } from '@sap-ux/axios-extension';
import { UI5Config, UI5_DEFAULT, getEsmTypesVersion, getTypesPackage, getTypesVersion } from '@sap-ux/ui5-config';

/**
 * Retrieves the package name and version from the package.json file located two levels up the directory tree.
 *
 * @returns {Package} An object containing the `name` and `version` of the package.
 */
export function getPackageJSONInfo(): Package {
    const defaultPackage = {
        name: '@sap-ux/adp-tooling',
        version: 'NO_VERSION_FOUND'
    };

    try {
        return JSON.parse(readFileSync(join(__dirname, '../../package.json'), 'utf-8'));
    } catch (e) {
        return defaultPackage;
    }
}

/**
 * Determines the correct TypeScript definitions package and version based on a given UI5 version.
 *
 * If the version includes `"snapshot"`, it returns a predefined default types package and version.
 * Otherwise, it selects the appropriate package and computes the corresponding version using either
 * `getTypesVersion` or `getEsmTypesVersion`.
 *
 * @param {string} [ui5Version] - The version of UI5 (e.g., `"1.108.0"` or `"snapshot"`).
 * @returns {TypesConfig} - The package name and version string for the UI5 types.
 */
export function getTypes(ui5Version?: string): TypesConfig {
    if (ui5Version?.includes('snapshot')) {
        return {
            typesPackage: UI5_DEFAULT.TYPES_PACKAGE_NAME,
            typesVersion: `~${UI5_DEFAULT.TYPES_VERSION_BEST}`
        };
    }

    const typesPackage = getTypesPackage(ui5Version);
    const isTypesPackage = typesPackage === UI5_DEFAULT.TYPES_PACKAGE_NAME;
    const typesVersion = isTypesPackage ? getTypesVersion(ui5Version) : getEsmTypesVersion(ui5Version);

    return {
        typesPackage,
        typesVersion
    };
}

/**
 * Constructs a custom configuration object for the Adaptation Project (ADP).
 *
 * @param {OperationsType} environment - The operations type ('P' for on-premise or 'C' for cloud ready).
 * @param {object} pkg - The parsed contents of `package.json`.
 * @param {string} pkg.name - The name of the tool or package generating the config.
 * @param {string} pkg.version - The version of the tool generating the config.
 * @returns {CustomConfig} The generated ADP custom configuration object.
 */
export function getCustomConfig(environment: OperationsType, { name: id, version }: Package): CustomConfig {
    return {
        adp: {
            environment,
            support: {
                id: id ?? '',
                version: version ?? '',
                toolsId: uuidv4()
            }
        }
    };
}

/**
 * Get the variant for the CF project.
 *
 * @param {CfAdpWriterConfig} config - The CF configuration.
 * @returns {DescriptorVariant} The variant for the CF project.
 */
export function getCfVariant(config: CfAdpWriterConfig): DescriptorVariant {
    const { app, ui5 } = config;
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

    return variant;
}

/**
 * Get the ADP config for the CF project.
 *
 * @param {CfAdpWriterConfig} config - The CF configuration.
 * @returns {Record<string, unknown>} The ADP config for the CF project.
 */
export function getCfAdpConfig(config: CfAdpWriterConfig): Record<string, unknown> {
    const { app, project, ui5, cf } = config;
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

    return configJson;
}

/**
 * Writes a given project template files within a specified folder in the project directory.
 *
 * @param {string} baseTmplPath - The root path of the templates folder.
 * @param {string} projectPath - The root path of the project.
 * @param {AdpWriterConfig} data - The data to be populated in the template file.
 * @param {Editor} fs - The `mem-fs-editor` instance used for file operations.
 * @returns {void}
 */
export function writeTemplateToFolder(
    baseTmplPath: string,
    projectPath: string,
    data: AdpWriterConfig,
    fs: Editor
): void {
    const ui5Version = data.ui5?.version;
    const tmplPath = join(baseTmplPath, 'project', '**/*.*');
    const tsConfigPath = join(baseTmplPath, 'typescript', 'tsconfig.json');

    const { typesPackage, typesVersion } = getTypes(ui5Version);

    try {
        fs.copyTpl(tmplPath, projectPath, { ...data, typesPackage, typesVersion }, undefined, {
            globOptions: { dot: true },
            processDestinationPath: (filePath: string) => filePath.replace(/gitignore.tmpl/g, '.gitignore')
        });

        if (data.options?.enableTypeScript) {
            const id = data.app?.id?.split('.').join('/');
            fs.copyTpl(tsConfigPath, join(projectPath, 'tsconfig.json'), { id, typesPackage }, undefined, {
                globOptions: { dot: true }
            });
        }
    } catch (e) {
        throw new Error(`Could not write template files to folder. Reason: ${e.message}`);
    }
}

/**
 * Writes a ui5.yaml file within a specified folder in the project directory.
 *
 * @param {string} projectPath - The root path of the project.
 * @param {AdpWriterConfig} data - The data to be populated in the template file.
 * @param {Editor} fs - The `mem-fs-editor` instance used for file operations.
 * @returns {void}
 */
export async function writeUI5Yaml(projectPath: string, data: AdpWriterConfig, fs: Editor): Promise<void> {
    try {
        const ui5ConfigPath = join(projectPath, 'ui5.yaml');
        const baseUi5ConfigContent = fs.read(ui5ConfigPath);
        const ui5Config = await UI5Config.newInstance(baseUi5ConfigContent);
        ui5Config.setConfiguration({ propertiesFileSourceEncoding: 'UTF-8' });
        enhanceUI5YamlWithCustomConfig(ui5Config, data);
        enhanceUI5YamlWithTranspileMiddleware(ui5Config, data);
        enhanceUI5Yaml(ui5Config, data);
        enhanceUI5YamlWithCustomTask(ui5Config, data as AdpWriterConfig & { app: CloudApp });

        fs.write(ui5ConfigPath, ui5Config.toString());
    } catch (e) {
        throw new Error(`Could not write ui5.yaml file. Reason: ${e.message}`);
    }
}

/**
 * Writes a ui5-deploy.yaml file within a specified folder in the project directory.
 *
 * @param {string} projectPath - The root path of the project.
 * @param {AdpWriterConfig} data - The data to be populated in the template file.
 * @param {Editor} fs - The `mem-fs-editor` instance used for file operations.
 * @returns {void}
 */
export async function writeUI5DeployYaml(projectPath: string, data: AdpWriterConfig, fs: Editor): Promise<void> {
    try {
        if (hasDeployConfig(data)) {
            const ui5ConfigPath = join(projectPath, 'ui5.yaml');
            const baseUi5ConfigContent = fs.read(ui5ConfigPath);
            const ui5DeployConfig = await UI5Config.newInstance(baseUi5ConfigContent);
            enhanceUI5DeployYaml(ui5DeployConfig, data);

            fs.write(join(projectPath, 'ui5-deploy.yaml'), ui5DeployConfig.toString());
        }
    } catch (e) {
        throw new Error(`Could not write ui5-deploy.yaml file. Reason: ${e.message}`);
    }
}

/**
 * Write CF-specific templates and configuration files.
 *
 * @param {string} basePath - The base path.
 * @param {DescriptorVariant} variant - The descriptor variant.
 * @param {CfAdpWriterConfig} config - The CF configuration.
 * @param {Editor} fs - The memfs editor instance.
 */
export async function writeCfTemplates(
    basePath: string,
    variant: DescriptorVariant,
    config: CfAdpWriterConfig,
    fs: Editor
): Promise<void> {
    const baseTmplPath = join(__dirname, '../../templates');
    const templatePath = config.options?.templatePathOverwrite ?? baseTmplPath;
    const { app, baseApp, cf, project, options } = config;

    fs.copyTpl(
        join(templatePath, 'project/webapp/manifest.appdescr_variant'),
        join(project.folder, 'webapp', 'manifest.appdescr_variant'),
        { app: variant }
    );

    fs.copyTpl(join(templatePath, 'cf/package.json'), join(project.folder, 'package.json'), {
        module: project.name
    });

    fs.copyTpl(join(templatePath, 'cf/ui5.yaml'), join(project.folder, 'ui5.yaml'), {
        appHostId: baseApp.appHostId,
        appName: baseApp.appName,
        appVersion: baseApp.appVersion,
        module: project.name,
        html5RepoRuntime: cf.html5RepoRuntimeGuid,
        org: cf.org.GUID,
        space: cf.space.GUID,
        sapCloudService: cf.businessSolutionName ?? '',
        instanceName: cf.businessService
    });

    fs.writeJSON(join(project.folder, '.adp/config.json'), getCfAdpConfig(config));

    fs.copyTpl(join(templatePath, 'cf/i18n/i18n.properties'), join(project.folder, 'webapp/i18n/i18n.properties'), {
        module: project.name,
        moduleTitle: app.title,
        appVariantId: app.namespace,
        i18nGuid: config.app.i18nDescription
    });

    fs.copy(join(templatePath, 'cf/_gitignore'), join(project.folder, '.gitignore'));

    if (options?.addStandaloneApprouter) {
        fs.copyTpl(
            join(templatePath, 'cf/approuter/package.json'),
            join(basePath, `${project.name}-approuter/package.json`),
            {
                projectName: project.name
            }
        );

        fs.copyTpl(
            join(templatePath, 'cf/approuter/xs-app.json'),
            join(basePath, `${project.name}-approuter/xs-app.json`),
            {}
        );
    }

    if (!fs.exists(join(basePath, 'xs-security.json'))) {
        fs.copyTpl(join(templatePath, 'cf/xs-security.json'), join(basePath, 'xs-security.json'), {
            projectName: project.name
        });
    }
}
