import type { Editor } from 'mem-fs-editor';
import { getFclConfig, extendPageJSON } from './common';
import type { Manifest } from '../common/types';
import type { ListReport, InternalListReport } from './types';
import { coerce, gte } from 'semver';

/**
 * Enhances the provided list report configuration with default data.
 *
 * @param data - a list report configuration object
 * @param manifest - application manifest
 * @returns enhanced configuration
 */
function enhanceData(data: ListReport, manifest: Manifest): InternalListReport {
    const config: InternalListReport = { settings: {}, ...data, name: 'ListReport', ...getFclConfig(manifest) };
    const minVersion = coerce(data.minUI5Version);

    // move settings into correct possition in the manifest
    if (minVersion && gte(minVersion, '1.94.0')) {
        config.settings.contextPath = data.contextPath ? data.contextPath : `/${data.entity}`;
    } else {
        config.settings.entitySet = data.entity;
    }
    config.settings.navigation = {};
    // use standard file name if i18n enhancement required
    if (config.settings.enhanceI18n === true) {
        config.settings.enhanceI18n = `i18n/custom${config.entity}${config.name}.properties`;
    }
    // move table settings into the correct structure
    if (config.settings.tableSettings) {
        config.settings.controlConfiguration = config.settings.controlConfiguration ?? {};
        config.settings.controlConfiguration['@com.sap.vocabularies.UI.v1.LineItem'] =
            config.settings.controlConfiguration['@com.sap.vocabularies.UI.v1.LineItem'] ?? {};
        config.settings.controlConfiguration['@com.sap.vocabularies.UI.v1.LineItem'].tableSettings =
            config.settings.tableSettings;
        delete config.settings.tableSettings;
    }
    return config;
}

/**
 * Add a ListReport to an existing UI5 application.
 *
 * @param basePath - the base path
 * @param data - the object page configuration
 * @param fs - the memfs editor instance
 * @returns the updated memfs editor instance
 */
export function generate(basePath: string, data: ListReport, fs?: Editor): Editor {
    return extendPageJSON(basePath, data, enhanceData, 'page/list/manifest.json', fs);
}
