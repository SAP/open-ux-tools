import { create as createStorage } from 'mem-fs';
import type { Editor } from 'mem-fs-editor';
import { create } from 'mem-fs-editor';
import type { CustomView, InternalCustomView } from './types';
import { join } from 'path';
import { render } from 'ejs';
import { validateVersion, validateBasePath } from '../common/validate';
import type { Manifest, Ui5RoutingTarget, Ui5TargetSettings } from '../common/types';
import { setCommonDefaults, getDefaultFragmentContent } from '../common/defaults';
import { applyEventHandlerConfiguration } from '../common/event-handler';
import { getTemplatePath } from '../templates';

/**
 * Enhances the provided custom view configuration with default data.
 *
 * @param {Editor} fs - the mem-fs editor instance
 * @param {CustomView} data - a custom view configuration object
 * @param {string} manifestPath - path to the project's manifest.json
 * @param {Manifest} manifest - the application manifest
 * @returns enhanced configuration
 */
function enhanceConfig(fs: Editor, data: CustomView, manifestPath: string, manifest: Manifest): InternalCustomView {
    const config: CustomView & Partial<InternalCustomView> = { ...data };
    setCommonDefaults(config, manifestPath, manifest);

    // Apply event handler
    if (config.eventHandler) {
        config.eventHandler = applyEventHandlerConfiguration(fs, config, config.eventHandler, true, config.typescript);
    }

    // existing views
    const existingViews = (manifest['sap.ui5']?.routing?.targets?.[data.target] as Ui5RoutingTarget<Ui5TargetSettings>)
        .options?.settings?.views;
    if (existingViews) {
        config.views = existingViews;
    }

    // generate view content
    if (typeof config.control === 'string') {
        config.content = config.control;
    } else {
        config.content = getDefaultFragmentContent(config.name, config.eventHandler, true);
    }

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
    validateVersion(customView.minUI5Version);
    if (!fs) {
        fs = create(createStorage());
    }
    validateBasePath(basePath, fs);

    const manifestPath = join(basePath, 'webapp/manifest.json');
    const manifest = fs.readJSON(manifestPath) as Manifest;

    // merge with defaults
    const completeView = enhanceConfig(fs, customView, manifestPath, manifest);

    // enhance manifest with view definition
    const filledTemplate = render(fs.read(getTemplatePath('view/manifest.json')), completeView, {});
    fs.extendJSON(manifestPath, JSON.parse(filledTemplate));

    // add fragment
    const viewPath = join(completeView.path, `${completeView.name}.fragment.xml`);
    if (completeView.control === true) {
        fs.copyTpl(getTemplatePath('view/ext/CustomViewWithTable.xml'), viewPath, completeView);
    } else if (!fs.exists(viewPath)) {
        fs.copyTpl(getTemplatePath('common/Fragment.xml'), viewPath, completeView);
    }

    return fs;
}
