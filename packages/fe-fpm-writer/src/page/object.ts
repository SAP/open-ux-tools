import type { Editor } from 'mem-fs-editor';
import { getFclConfig, extendPageJSON } from './common';
import type { Manifest } from '../common/types';
import type { ObjectPage, InternalObjectPage } from './types';

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
    if (data.contextPath) {
        config.settings.contextPath = data.contextPath;
    } else {
        config.settings.entitySet = data.entity;
    }
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
    return extendPageJSON(basePath, data, enhanceData, '/page/object/manifest.json', fs);
}
