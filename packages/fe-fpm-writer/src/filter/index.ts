import { create as createStorage } from 'mem-fs';
import type { Editor } from 'mem-fs-editor';
import { create } from 'mem-fs-editor';
import type { CustomFilter, InternalCustomFilter, PageOptions } from './types';
import { join } from 'path';
import { render } from 'ejs';
import { validateBasePath } from '../common/validate';
import type { Manifest } from '../common/types';
import { setCommonDefaults } from '../common/defaults';
import { getTemplatePath } from '../templates';
import { getJsonSpace } from '../common/file';
import { applyEventHandlerConfiguration, contextParameter } from '../common/event-handler';
import type { FilterField } from '../building-block/types';
import type { ManifestNamespace } from '@sap-ux/project-access';
import { getManifest } from '../common/utils';

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

    // set default values for requirement, language, the fragment file name
    config.required = config.required ?? false;
    config.typescript = !!config.typescript;
    config.fragmentFile = config.fragmentFile ?? config.name;
    if (config.eventHandler === true) {
        config.eventHandler = {};
    }
    if (typeof config.eventHandler === 'object' && !config.eventHandler.fnName) {
        config.eventHandler.fnName = 'filterItems';
    }

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
export async function generateCustomFilter(basePath: string, filterConfig: CustomFilter, fs?: Editor): Promise<Editor> {
    if (!fs) {
        fs = create(createStorage());
    }
    validateBasePath(basePath, fs);

    const { path: manifestPath, content: manifest } = await getManifest(basePath, fs);
    const config = enhanceConfig(filterConfig, manifestPath, manifest);

    // Apply event handler
    if (config.eventHandler) {
        config.eventHandler = applyEventHandlerConfiguration(
            fs,
            config,
            config.eventHandler,
            {
                controllerSuffix: false,
                typescript: config.typescript,
                templatePath: 'filter/Controller'
            },
            contextParameter
        );
    }

    // enhance manifest with the filter definition and controller reference
    const filters = enhanceManifestAndGetFiltersReference(manifest);
    Object.assign(filters, JSON.parse(render(fs.read(getTemplatePath(`filter/manifest.json`)), config, {})));
    fs.writeJSON(manifestPath, manifest, undefined, getJsonSpace(fs, manifestPath, filterConfig.tabInfo));

    // create a fragment file
    const fragmentPath = join(config.path, `${config.fragmentFile}.fragment.xml`);
    if (!fs.exists(fragmentPath)) {
        fs.copyTpl(getTemplatePath(`filter/fragment.xml`), fragmentPath, config);
    }

    return fs;
}

/**
 * Enhance the target object in the manifest with the required nested objects and return a reference to it.
 *
 * @param {Manifest} manifest - the application manifest
 * @returns Filters object of the first page
 */
function enhanceManifestAndGetFiltersReference(manifest: Manifest): FilterField | {} {
    if (manifest['sap.ui5']?.routing?.targets) {
        const pages = manifest['sap.ui5'].routing.targets;
        const lrPage: ManifestNamespace.Target & PageOptions = Object.values(pages)[0];
        lrPage.options ||= {};
        lrPage.options.settings ||= {};
        lrPage.options.settings.controlConfiguration ||= {};
        lrPage.options.settings.controlConfiguration['@com.sap.vocabularies.UI.v1.SelectionFields'] ||= {};
        lrPage.options.settings.controlConfiguration['@com.sap.vocabularies.UI.v1.SelectionFields'].filterFields ||= {};
        return lrPage.options.settings.controlConfiguration['@com.sap.vocabularies.UI.v1.SelectionFields'].filterFields;
    }
    return {};
}
