import { join } from 'path';
import { create as createStorage } from 'mem-fs';
import type { Editor } from 'mem-fs-editor';
import { create } from 'mem-fs-editor';
import { render } from 'ejs';
import { getFclConfig, getManifestJsonExtensionHelper, validatePageConfig } from './common';
import type { Manifest } from '../common/types';
import type { ObjectPage, InternalObjectPage } from './types';
import { getTemplatePath } from '../templates';

/**
 * Enhances the provided list report configuration with default data.
 *
 * @param data - a list report configuration object
 * @param manifest - application manifest
 * @returns enhanced configuration
 */
function enhanceData(data: ObjectPage, manifest: Manifest): InternalObjectPage {
    const config: InternalObjectPage = { settings: {}, ...data, name: 'ObjectPage', ...getFclConfig(manifest) };

    // move settings into correct possition in the manifest
    config.settings.entitySet = data.entity;
    config.settings.navigation = {};
    // use standard file name if i18n enhancement required
    if (config.settings.enhanceI18n === true) {
        config.settings.enhanceI18n = `i18n/custom${config.entity}${config.name}.properties`;
    }
    return config;
}

/**
 * Add an object page to an existing UI5 application.
 *
 * @param basePath - the base path
 * @param data - the object page configuration
 * @param fs - the memfs editor instance
 * @returns the updated memfs editor instance
 */
export function generate(basePath: string, data: ObjectPage, fs?: Editor): Editor {
    if (!fs) {
        fs = create(createStorage());
    }
    validatePageConfig(basePath, data, fs);

    const manifestPath = join(basePath, 'webapp/manifest.json');
    const manifest = fs.readJSON(manifestPath) as Manifest;

    const config = enhanceData(data, manifest);

    // enhance manifest.json
    fs.extendJSON(
        manifestPath,
        JSON.parse(render(fs.read(getTemplatePath('/page/object/manifest.json')), config, {})),
        getManifestJsonExtensionHelper(config)
    );

    return fs;
}
