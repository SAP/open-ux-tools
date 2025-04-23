import type { Editor } from 'mem-fs-editor';
import { getFclConfig, extendPageJSON, initializeTargetSettings, getLibraryDependencies } from './common';
import type { Manifest } from '../common/types';
import type { ObjectPage, InternalObjectPage } from './types';
import { PageType } from './types';

/**
 * Enhances the provided list report configuration with default data.
 *
 * @param data - a list report configuration object
 * @param manifest - application manifest
 * @returns enhanced configuration
 */
function enhanceData(data: ObjectPage, manifest: Manifest): InternalObjectPage {
    const config: InternalObjectPage = {
        ...data,
        settings: initializeTargetSettings(data, data.settings),
        name: PageType.ObjectPage
    };

    // set FCL configuration
    const fclConfig = getFclConfig(manifest, config.navigation);
    config.fcl = fclConfig.fcl;
    config.controlAggregation = fclConfig.controlAggregation;

    // set library dependencies
    config.libraries = getLibraryDependencies(PageType.ObjectPage);

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
export async function generate(basePath: string, data: ObjectPage, fs?: Editor): Promise<Editor> {
    return extendPageJSON(basePath, data, enhanceData, '/page/object/manifest.json', fs);
}
