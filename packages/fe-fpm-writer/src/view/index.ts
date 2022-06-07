import { create as createStorage } from 'mem-fs';
import type { Editor } from 'mem-fs-editor';
import { create } from 'mem-fs-editor';
import type { CustomView, InternalCustomView } from './types';
import { join } from 'path';
import { render } from 'ejs';
import { validateVersion, validateBasePath } from '../common/validate';
import type { Manifest } from '../common/types';
import { setCommonDefaults, getDefaultFragmentContent } from '../common/defaults';

/**
 * Enhances the provided custom view configuration with additional data.
 *
 * @param {CustomView} data - a custom view configuration object
 * @param {string} manifestPath - path to the project's manifest.json
 * @param {Manifest} manifest - the application manifest
 * @returns enhanced configuration
 */
function enhanceConfig(data: CustomView, manifestPath: string, manifest: Manifest): InternalCustomView {
    const config: CustomView & Partial<InternalCustomView> = { ...data };
    setCommonDefaults(config, manifestPath, manifest);

    // set default event handler if it is to be created
    if (config.eventHandler === true) {
        config.eventHandler = `${config.ns}.${config.name}.onPress`;
    }

    // generate view content
    config.content = config.control || getDefaultFragmentContent(config.name, config.eventHandler);

    return config as InternalCustomView;
}

/**
 * Add a custom view to an existing UI5 application.
 *
 * @param {string} basePath - the base path
 * @param {CustomView} customView - the custom view configuration
 * @param {Editor} [fs] - the mem-fs editor instance
 * @returns {Promise<Editor>} the updated mem-fs editor instance
 */
export function generateCustomView(basePath: string, customView: CustomView, fs?: Editor): Editor {
    validateVersion(customView.ui5Version);
    if (!fs) {
        fs = create(createStorage());
    }
    validateBasePath(basePath, fs);

    const manifestPath = join(basePath, 'webapp/manifest.json');
    const manifest = fs.readJSON(manifestPath) as Manifest;

    const root = join(__dirname, '../../templates');

    // merge with defaults
    const completeView = enhanceConfig(customView, manifestPath, manifest);

    // add event handler if requested
    if (completeView.eventHandler) {
        const controllerPath = join(completeView.path, `${completeView.name}.js`);
        if (!fs.exists(controllerPath)) {
            fs.copyTpl(join(root, 'common/EventHandler.js'), controllerPath, completeView);
        }
    }

    // enhance manifest with view definition
    const filledTemplate = render(fs.read(join(root, 'view', `manifest.json`)), completeView);
    fs.extendJSON(manifestPath, JSON.parse(filledTemplate));

    // add fragment
    const viewPath = join(completeView.path, `${completeView.name}.fragment.xml`);
    if (!fs.exists(viewPath)) {
        fs.copyTpl(join(root, 'common/Fragment.xml'), viewPath, completeView);
    }

    return fs;
}
