import { create as createStorage } from 'mem-fs';
import type { Editor } from 'mem-fs-editor';
import { create } from 'mem-fs-editor';
import type { CustomFilter, InternalCustomFilter } from './types';
import { join } from 'path';
import { render } from 'ejs';
import { validateBasePath } from '../common/validate';
import type { Manifest } from '../common/types';
import { setCommonDefaults } from '../common/defaults';
import { getTemplatePath } from '../templates';
import { getJsonSpace } from '../common/file';
import { applyEventHandlerConfiguration, contextParameter } from '../common/event-handler';

/**
 * Enhances the provided custom filter configuration with default data.
 *
 * @param {CustomFilter} data - a custom filter configuration object
 * @param {string} manifestPath - path to the project's manifest.json
 * @param {Manifest} manifest - the application manifest
 * @returns enhanced configuration
 */
function enhanceConfig(data: CustomFilter, manifestPath: string, manifest: Manifest): InternalCustomFilter {
    // clone input
    const config: CustomFilter & Partial<InternalCustomFilter> = data;

    setCommonDefaults(config, manifestPath, manifest);

    // set default values for requiremetn and language, create the template path
    config.required = config.required || false;
    config.typescript = !!config.typescript;
    config.template = config.template || `${config.ns}.${config.name}`;

    return config as InternalCustomFilter;
}

/**
 * Add a custom filter to the filter bar of an existing UI5 application.
 *
 * @param {string} basePath - the base path
 * @param {CustomFilter} filterConfig - the custom filter configuration
 * @param {Editor} [fs] - the memfs editor instance
 * @returns {Promise<Editor>} the updated memfs editor instance
 */
export function generateCustomFilter(basePath: string, filterConfig: CustomFilter, fs?: Editor): Editor {
    if (!fs) {
        fs = create(createStorage());
    }
    validateBasePath(basePath, fs);

    const manifestPath = join(basePath, 'webapp/manifest.json');
    const manifest = fs.readJSON(manifestPath) as Manifest;
    const config = enhanceConfig(filterConfig, manifestPath, manifest);

    // Apply event handler
    if (config.eventHandler) {
        config.eventHandler = applyEventHandlerConfiguration(
            fs,
            config,
            config.eventHandler,
            false,
            config.typescript,
            contextParameter,
            { templatePath: 'filter/Controller', fnName: 'itemsFilter', fileName: config.name }
        );
    } else {
        // create a controller file
        const ext = filterConfig.typescript ? 'ts' : 'js';
        const viewPath = join(config.path, `${config.name}.${ext}`);
        if (!fs.exists(viewPath)) {
            fs.copyTpl(getTemplatePath(`filter/Controller.${ext}`), viewPath, config);
        }
    }

    // enhance manifest with the filter definition and controller reference
    const filters = enhanceManifestAndGetFiltersReference(manifest, filterConfig);
    Object.assign(filters, JSON.parse(render(fs.read(getTemplatePath(`filter/manifest.json`)), config, {})));
    fs.writeJSON(manifestPath, manifest, undefined, getJsonSpace(fs, manifestPath, filterConfig.tabInfo));

    // create a fragment file
    const fragmentPath = join(config.path, `${config.name}.fragment.xml`);
    fs.copyTpl(getTemplatePath(`filter/fragment.xml`), fragmentPath, config);

    return fs;
}

/**
 * Enhance the target object in the manifest with the required nested objects and return a reference to it.
 *
 * @param {Manifest} manifest - the application manifest
 * @param {CustomFilter} customFilter - the custom filter configuration
 * @returns Filters object of the given page
 */
function enhanceManifestAndGetFiltersReference(manifest: any, customFilter: CustomFilter): any {
    const page = Object.values(manifest['sap.ui5'].routing.targets)[0] as any;
    page.options = page.options || {};
    page.options.settings = page.options.settings || {};
    page.options.settings.controlConfiguration = page.options.settings.controlConfiguration || {};
    page.options.settings.controlConfiguration['@com.sap.vocabularies.UI.v1.SelectionFields'] =
        page.options.settings.controlConfiguration['@com.sap.vocabularies.UI.v1.SelectionFields'] || {};
    page.options.settings.controlConfiguration['@com.sap.vocabularies.UI.v1.SelectionFields'].filterFields =
        page.options.settings.controlConfiguration['@com.sap.vocabularies.UI.v1.SelectionFields'].filterFields || {};
    return page.options.settings.controlConfiguration['@com.sap.vocabularies.UI.v1.SelectionFields'].filterFields;
}
