import { create as createStorage } from 'mem-fs';
import type { Editor } from 'mem-fs-editor';
import { create } from 'mem-fs-editor';
import type { CustomField, InternalCustomField } from './types';
import { join } from 'node:path';
import { render } from 'ejs';
import { validateVersion, validateBasePath } from '../common/validate';
import type { Manifest } from '../common/types';
import { setCommonDefaults, getDefaultFragmentContentData } from '../common/defaults';
import { applyEventHandlerConfiguration } from '../common/event-handler';
import { extendJSON } from '../common/file';
import { getTemplatePath } from '../templates';
import { getManifest } from '../common/utils';

/**
 * Enhances the provided custom field configuration with default data.
 *
 * @param {Editor} fs - the mem-fs editor instance
 * @param {CustomField} data - a custom field configuration object
 * @param {string} manifestPath - path to the project's manifest.json
 * @param {Manifest} manifest - the application manifest
 * @returns enhanced configuration
 */
function enhanceConfig(fs: Editor, data: CustomField, manifestPath: string, manifest: Manifest): InternalCustomField {
    // clone input and set defaults
    const config: CustomField & Partial<InternalCustomField> = { ...data };
    setCommonDefaults(config, manifestPath, manifest);

    // Apply event handler
    if (config.eventHandler) {
        config.eventHandler = applyEventHandlerConfiguration(fs, config, config.eventHandler, {
            controllerSuffix: false,
            typescript: config.typescript
        });
    }

    // generate field content
    if (config.control) {
        config.content = config.control;
    } else {
        Object.assign(config, getDefaultFragmentContentData(config.name, config.eventHandler));
    }

    return config as InternalCustomField;
}

/**
 * Add a custom field to an existing UI5 application.
 *
 * @param {string} basePath - the base path
 * @param {CustomField} customField - the custom field configuration
 * @param {Promise<Editor>} [fs] - the mem-fs editor instance
 * @returns {Promise<Editor>} the updated mem-fs editor instance
 */
export async function generateCustomField(basePath: string, customField: CustomField, fs?: Editor): Promise<Editor> {
    validateVersion(customField.minUI5Version);
    if (!fs) {
        fs = create(createStorage());
    }
    await validateBasePath(basePath, fs);

    const { path: manifestPath, content: manifest } = await getManifest(basePath, fs);

    // merge with defaults
    const completeField = enhanceConfig(fs, customField, manifestPath, manifest);

    // add fragment
    const viewPath = join(completeField.path, `${completeField.fragmentFile ?? completeField.name}.fragment.xml`);
    if (!fs.exists(viewPath)) {
        fs.copyTpl(getTemplatePath('common/Fragment.xml'), viewPath, completeField);
    }

    // enhance manifest with field definition
    const templatePath = getTemplatePath('/field/manifest.json');
    const filledTemplate = render(fs.read(templatePath), completeField, {});
    extendJSON(fs, {
        filepath: manifestPath,
        content: filledTemplate,
        tabInfo: completeField.tabInfo
    });

    return fs;
}
