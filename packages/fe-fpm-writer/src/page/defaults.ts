import { Editor } from 'mem-fs-editor';

import { CustomPage, InternalCustomPage } from './types';
import { setCommonDefaults } from '../common/defaults';

/**
 * Enhances the provided custom page configuration with default data.
 *
 * @param {CustomPage} data - a custom page configuration object
 * @param manifestPath - path to the application manifest
 * @param fs - mem-fs reference to be used for file access
 * @returns enhanced configuration
 */
export function enhanceData(data: CustomPage, manifestPath: string, fs: Editor): InternalCustomPage {
    const manifest: any = fs.readJSON(manifestPath);

    // set common defaults
    const config = setCommonDefaults<CustomPage>(data, manifestPath, manifest);

    if (config.view === undefined) {
        config.view = {
            title: config.name
        };
    }
    return config;
}
