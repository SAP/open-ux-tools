import type { Editor } from 'mem-fs-editor';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { AbapServiceProvider } from '@sap-ux/axios-extension';
import { FileStoreService } from '@sap-ux/axios-extension';

import { getTemplatePath } from '../templates.js';
import type { AdpWriterConfig, CfAdpWriterConfig, CloudApp, DescriptorVariant, TypesConfig } from '../types.js';
import {
    enhanceUI5DeployYaml,
    enhanceUI5Yaml,
    enhanceUI5YamlWithCfCustomTask,
    enhanceUI5YamlWithCustomConfig,
    enhanceUI5YamlWithCustomTask,
    enhanceUI5YamlWithFioriToolsMiddleware,
    enhanceUI5YamlWithTranspileMiddleware,
    hasDeployConfig
} from './options.js';

import type { ToolsLogger } from '@sap-ux/logger';
import type { Package } from '@sap-ux/project-access';
import { UI5Config, UI5_DEFAULT, getEsmTypesVersion, getTypesPackage, getTypesVersion } from '@sap-ux/ui5-config';
import AdmZip from 'adm-zip';

const __dirname = dirname(fileURLToPath(import.meta.url));

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
 * Writes a fresh OPA5 scaffold for projects where no base-app tests exist.
 *
 * Copies the full `opa/` template tree (including dotfiles) into `projectPath`, including
 * a single welcome FirstJourney test. Called when `isOpaTestingEnabled` is true but
 * `importOpaTests` is false.
 *
 * @param {string} baseTmplPath - The root path of the templates folder.
 * @param {string} projectPath - The root path of the project.
 * @param {AdpWriterConfig} data - Template data used to expand EJS variables.
 * @param {Editor} fs - The `mem-fs-editor` instance used for file operations.
 * @returns {void}
 */
export function writeNewOpaTestProjectFiles(
    baseTmplPath: string,
    projectPath: string,
    data: AdpWriterConfig,
    fs: Editor
): void {
    const tmplPath = join(baseTmplPath, 'opa', '**/*.*');
    fs.copyTpl(tmplPath, projectPath, data, undefined, {
        globOptions: { dot: true }
    });
}

/**
 * Writes the root-level OPA5 config files for projects that import tests from the base app.
 *
 * Copies only `.adptest`, `.eslintignore`, `.eslintrc`, `pom.xml`, and `ui5-ci.yaml` from the
 * `opa/` templates — the base app's existing test files are left untouched. Called when both
 * `isOpaTestingEnabled` and `importOpaTests` are true.
 *
 * @param {string} baseTmplPath - The root path of the templates folder.
 * @param {string} projectPath - The root path of the project.
 * @param {AdpWriterConfig} data - Template data used to expand EJS variables.
 * @param {Editor} fs - The `mem-fs-editor` instance used for file operations.
 * @returns {void}
 */
export function writeExistingOpaTestProjectFiles(
    baseTmplPath: string,
    projectPath: string,
    data: AdpWriterConfig,
    fs: Editor
): void {
    ['.adptest', '.eslintignore', '.eslintrc', 'pom.xml', 'ui5-ci.yaml'].forEach((fileName) => {
        const tmplPath = join(baseTmplPath, 'opa', fileName);
        const destPath = join(projectPath, fileName);
        fs.copyTpl(tmplPath, destPath, data, undefined, {
            globOptions: { dot: true }
        });
    });
    // TODO avasilev: edit base app opa tests to match adp project policies.
}

/**
 * Copies mock server template files into the project output directory.
 *
 * Reads all files under `<baseTmplPath>/mockServer/` and writes them to
 * `projectPath`, expanding any EJS template variables using `data`.
 *
 * @param {string} baseTmplPath - The root path of the templates folder.
 * @param {string} projectPath - The root path of the project.
 * @param {AdpWriterConfig} data - The data to be populated in the template files.
 * @param {Editor} fs - The `mem-fs-editor` instance used for file operations.
 * @returns {void}
 */
export function writeMockServerFiles(
    baseTmplPath: string,
    projectPath: string,
    data: AdpWriterConfig,
    fs: Editor
): void {
    const tmplPath = join(baseTmplPath, 'mockServer', '**/*.*');
    fs.copyTpl(tmplPath, projectPath, data, undefined, {
        globOptions: { dot: true }
    });
}

/**
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
        enhanceUI5YamlWithCustomConfig(ui5Config, data.customConfig);
        enhanceUI5YamlWithTranspileMiddleware(ui5Config, data);
        enhanceUI5Yaml(ui5Config, data);
        enhanceUI5YamlWithCustomTask(ui5Config, data as AdpWriterConfig & { app: CloudApp });
        ui5Config.addBuilderResourceExcludes();

        fs.write(ui5ConfigPath, ui5Config.toString());
    } catch (e) {
        throw new Error(`Could not write ui5.yaml file. Reason: ${e.message}`);
    }
}

/**
 * Writes a ui5.yaml file for CF project within a specified folder in the project directory.
 *
 * @param {string} projectPath - The root path of the project.
 * @param {CfAdpWriterConfig} data - The data to be populated in the template file.
 * @param {Editor} fs - The `mem-fs-editor` instance used for file operations.
 * @returns {void}
 */
export async function writeCfUI5Yaml(projectPath: string, data: CfAdpWriterConfig, fs: Editor): Promise<void> {
    try {
        const ui5ConfigPath = join(projectPath, 'ui5.yaml');
        const baseUi5ConfigContent = fs.read(ui5ConfigPath);
        const ui5Config = await UI5Config.newInstance(baseUi5ConfigContent);
        ui5Config.setConfiguration({ propertiesFileSourceEncoding: 'UTF-8' });
        enhanceUI5YamlWithCustomConfig(ui5Config, data.customConfig);
        /** Builder task */
        enhanceUI5YamlWithCfCustomTask(ui5Config, data);
        /** Middlewares */
        enhanceUI5YamlWithFioriToolsMiddleware(ui5Config);
        ui5Config.addBuilderResourceExcludes();

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
    const templatePath = config.options?.templatePathOverwrite ?? getTemplatePath();
    const { app, project, options } = config;

    fs.copyTpl(
        join(templatePath, 'project/webapp/manifest.appdescr_variant'),
        join(project.folder, 'webapp', 'manifest.appdescr_variant'),
        { app: variant }
    );

    fs.copyTpl(join(templatePath, 'cf/package.json'), join(project.folder, 'package.json'), {
        module: project.name
    });

    fs.copyTpl(join(templatePath, 'cf/ui5.yaml'), join(project.folder, 'ui5.yaml'), {
        module: project.name
    });

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
            projectName: project.xsSecurityAppName
        });
    }
}

/**
 * Downloads the BSP application archive from the ABAP system.
 *
 * First attempts to use the `ABAP_REPOSITORY_SRV` OData service. If that is unavailable
 * (e.g. ABAP 7.31 / SAP_UI < 7.54), falls back to the ADT `FileStoreService`.
 *
 * @param {object} params
 * @param {string} params.bspName - The BSP application name on the ABAP system.
 * @param {AbapServiceProvider} params.provider - The ABAP service provider.
 * @param {ToolsLogger} params.logger - Logger instance.
 * @returns {Promise<Buffer | undefined>} The zip archive as a Buffer, or `undefined` if neither service is available.
 */
export async function downloadBaseApp({
    bspName,
    provider,
    logger
}: {
    bspName: string;
    provider: AbapServiceProvider;
    logger: ToolsLogger;
}): Promise<Buffer | undefined> {
    const ui5AbapRepository = provider.getUi5AbapRepository();

    try {
        return ui5AbapRepository.downloadFiles(bspName);
    } catch (error) {
        // ABAP_REPOSITORY_SRV may not be available on older systems (e.g. ABAP 731 / SAP_UI < 754).
        // Fall through to the ADT FileStoreService fallback below.
        logger.info(`ABAP_REPOSITORY_SRV unavailable, falling back to ADT.`);
        logger.debug(error);
    }

    const fileStoreService = await provider.getAdtService<FileStoreService>(FileStoreService);
    if (!fileStoreService) {
        logger.info('ADT FileStore not available for this system — skipping file listing.');
        return undefined;
    }

    return ui5AbapRepository.downloadFilesViaAdt(bspName, fileStoreService);
}

/**
 * Extracts entries from a zip archive whose paths start with `srcPath` into `targetPath`.
 *
 * @param {Buffer} archive - The zip archive buffer.
 * @param {string} srcPath - Path prefix to filter entries by (e.g. `webapp/localService/`).
 * @param {string} targetPath - File system path to extract matching entries into.
 * @returns {void}
 */
export function extractEntryFromArchive(archive: Buffer, srcPath: string, targetPath: string): void {
    const zip = new AdmZip(archive);
    zip.getEntries()
        .filter(({ entryName }) => entryName.startsWith(srcPath))
        .forEach((entry) => {
            zip.extractEntryTo(entry, targetPath, true, true);
        });
}
