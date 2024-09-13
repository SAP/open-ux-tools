import { join } from 'path';
import { create as createStorage } from 'mem-fs';
import type { Editor } from 'mem-fs-editor';
import { create } from 'mem-fs-editor';
import { render } from 'ejs';
import type { CustomPage, InternalCustomPage } from './types';
import { PageType } from './types';
import {
    initializeTargetSettings,
    getFclConfig,
    getManifestJsonExtensionHelper,
    validatePageConfig,
    getLibraryDependencies
} from './common';
import { setCommonDefaults } from '../common/defaults';
import type { Manifest } from '../common/types';
import { validateVersion } from '../common/validate';
import { getTemplatePath } from '../templates';
import { coerce, gte } from 'semver';
import { addExtensionTypes, getManifestPath } from '../common/utils';
import { extendJSON } from '../common/file';

/**
 * Enhances the provided custom page configuration with default data.
 *
 * @param data - a custom page configuration object
 * @param manifestPath - path to the application manifest
 * @param fs - mem-fs reference to be used for file access
 * @returns enhanced configuration
 */
export function enhanceData(data: CustomPage, manifestPath: string, fs: Editor): InternalCustomPage {
    const manifest = fs.readJSON(manifestPath) as Manifest;

    // set common defaults
    const config = setCommonDefaults(data, manifestPath, manifest) as InternalCustomPage;
    config.settings = initializeTargetSettings(data);

    // set library dependencies
    config.libraries = getLibraryDependencies(PageType.CustomPage);

    // set FCL configuration
    const fclConfig = getFclConfig(manifest, config.navigation);
    config.fcl = fclConfig.fcl;
    config.controlAggregation = fclConfig.controlAggregation;

    if (config.view === undefined) {
        config.view = {
            title: config.name
        };
    }
    return config;
}

/**
 * Validate the UI5 version and if valid return the root folder for the templates to be used.
 *
 * @param ui5Version - optional minimum required UI5 version
 * @returns root folder  containg the templates if the version is supported otherwise throws an error
 */
export function getTemplateRoot(ui5Version?: string): string {
    const minVersion = coerce(ui5Version);
    if (!minVersion || gte(minVersion, '1.94.0')) {
        return getTemplatePath('/page/custom/1.94');
    } else {
        return getTemplatePath('/page/custom/1.84');
    }
}

/**
 * Add a custom page to an existing UI5 application.
 *
 * @param {string} basePath - the base path
 * @param {CustomPage} data - the custom page configuration
 * @param {Editor} [fs] - the memfs editor instance
 * @returns {Promise<Editor>} the updated memfs editor instance
 */
export async function generate(basePath: string, data: CustomPage, fs?: Editor): Promise<Editor> {
    if (!fs) {
        fs = create(createStorage());
    }
    validateVersion(data.minUI5Version);
    validatePageConfig(basePath, data, fs, []);

    const manifestPath = await getManifestPath(basePath, fs);

    const config = enhanceData(data, manifestPath, fs);

    // merge content into existing files
    const root = getTemplateRoot(data.minUI5Version);

    // enhance manifest.json
    extendJSON(fs, {
        filepath: manifestPath,
        content: render(fs.read(join(root, `manifest.json`)), config, {}),
        replacer: getManifestJsonExtensionHelper(config),
        tabInfo: data.tabInfo
    });

    // add extension content
    const viewPath = join(config.path, `${config.name}.view.xml`);
    if (!fs.exists(viewPath)) {
        fs.copyTpl(join(root, 'ext/View.xml'), viewPath, config);
        // i18n.properties
        const manifest = fs.readJSON(manifestPath) as Manifest;
        const defaultI18nPath = 'i18n/i18n.properties';
        const customI18nPath = manifest?.['sap.ui5']?.models?.i18n?.uri;
        const i18nPath = join(basePath, 'webapp', customI18nPath ?? defaultI18nPath);
        const i18TemplatePath = join(root, 'i18n', 'i18n.properties');
        if (fs.exists(i18nPath)) {
            fs.append(i18nPath, render(fs.read(i18TemplatePath), config, {}));
        } else {
            fs.copyTpl(i18TemplatePath, i18nPath, config);
        }
    }
    const ext = data.typescript ? 'ts' : 'js';
    const controllerPath = join(config.path, `${config.name}.controller.${ext}`);
    if (!fs.exists(controllerPath)) {
        fs.copyTpl(join(root, `ext/Controller.${ext}`), controllerPath, config);
    }

    if (data.typescript) {
        addExtensionTypes(basePath, data.minUI5Version, fs);
    }

    return fs;
}
