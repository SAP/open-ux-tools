import type { Editor } from 'mem-fs-editor';

import type { ManifestNamespace } from '@sap-ux/ui5-config';
import type { CustomPage, InternalCustomPage } from './types';
import type { Manifest } from '../common/types';
import { FCL_ROUTER, setCommonDefaults } from '../common/defaults';

/**
 * Enhances the provided custom page configuration with default data.
 *
 * @param data - a custom page configuration object
 * @param manifestPath - path to the application manifest
 * @param fs - mem-fs reference to be used for file access
 * @returns enhanced configuration
 */
export function enhanceData(data: CustomPage, manifestPath: string, fs: Editor): InternalCustomPage {
    const manifest = fs.readJSON(manifestPath) as Manifest;

    // set common defaults
    const config = setCommonDefaults(data, manifestPath, manifest) as InternalCustomPage;

    // if FCL is enabled enhance the configuration
    if (manifest['sap.ui5']?.routing?.config?.routerClass === FCL_ROUTER) {
        config.fcl = true;
        if (config.navigation) {
            const sourceRoute = ((manifest['sap.ui5']?.routing?.routes as ManifestNamespace.Route[]) || []).find(
                (route) => route.name === config.navigation?.sourcePage
            );
            config.controlAggregation =
                ((sourceRoute?.target as string[]) ?? []).length > 1 ? 'endColumnPages' : 'midColumnPages';
        } else {
            config.controlAggregation = 'beginColumnPages';
        }
    }

    if (config.view === undefined) {
        config.view = {
            title: config.name
        };
    }
    return config;
}
