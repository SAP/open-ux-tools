import type { Editor } from 'mem-fs-editor';

import type { CustomPage, InternalCustomPage } from './types';
import type { Manifest } from 'common/types';
import { setCommonDefaults } from '../common/defaults';

const FCL_ROUTER = 'sap.f.routing.Router';
/**
 * Enhances the provided custom page configuration with default data.
 *
 * @param {CustomPage} data - a custom page configuration object
 * @param manifestPath - path to the application manifest
 * @param fs - mem-fs reference to be used for file access
 * @returns enhanced configuration
 */
export function enhanceData(data: CustomPage, manifestPath: string, fs: Editor): InternalCustomPage {
    const manifest = fs.readJSON(manifestPath) as Manifest;

    // set common defaults
    const config = setCommonDefaults(data, manifestPath, manifest) as InternalCustomPage;

    config.fcl = manifest['sap.ui5']?.routing?.config?.routerClass === FCL_ROUTER;
    if (config.view === undefined) {
        config.view = {
            title: config.name
        };
    }
    return config;
}
