import { join } from 'path';
import { create as createStorage } from 'mem-fs';
import type { Editor } from 'mem-fs-editor';
import { create } from 'mem-fs-editor';
import { render } from 'ejs';
import { enhanceData } from './defaults';
import type { CustomPage } from './types';
import { validateVersion } from '../common/validate';
import { getManifestJsonExtensionHelper, validatePageConfig } from './common';

/**
 * Validate the UI5 version and if valid return the root folder for the templates to be used.
 *
 * @param ui5Version - optional minimum required UI5 version
 * @returns root folder  containg the templates if the version is supported otherwise throws an error
 */
export function getTemplateRoot(ui5Version?: number): string {
    if (ui5Version === undefined || ui5Version >= 1.94) {
        return join(__dirname, '../../templates/page/1.94');
    } else {
        return join(__dirname, '../../templates/page/1.84');
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
export function generate(basePath: string, data: CustomPage, fs?: Editor): Editor {
    if (!fs) {
        fs = create(createStorage());
    }
    validateVersion(data.ui5Version);
    validatePageConfig(basePath, data, fs);

    const manifestPath = join(basePath, 'webapp/manifest.json');
    const config = enhanceData(data, manifestPath, fs);

    // merge content into existing files
    const root = getTemplateRoot(data.ui5Version);

    // enhance manifest.json
    fs.extendJSON(
        manifestPath,
        JSON.parse(render(fs.read(join(root, `manifest.json`)), config)),
        getManifestJsonExtensionHelper(config)
    );

    // add extension content
    const viewPath = join(config.path, `${config.name}.view.xml`);
    if (!fs.exists(viewPath)) {
        fs.copyTpl(join(root, 'ext/View.xml'), viewPath, config);
    }
    const controllerPath = join(config.path, `${config.name}.controller.js`);
    if (!fs.exists(controllerPath)) {
        fs.copyTpl(join(root, 'ext/Controller.js'), controllerPath, config);
    }

    return fs;
}
