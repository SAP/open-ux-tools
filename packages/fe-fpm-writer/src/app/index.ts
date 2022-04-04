import { create as createStorage } from 'mem-fs';
import type { Editor } from 'mem-fs-editor';
import { create } from 'mem-fs-editor';
import { join } from 'path';
import { lt } from 'semver';
import { FCL_ROUTER } from '../common/defaults';
import type { SAPJSONSchemaForWebApplicationManifestFile as Manifest } from '../common/manifest';

/**
 * Configurable options when enabling the Flexible Programming Model in a UI5 application.
 *
 */
export interface FPMConfig {
    /**
     * If set to true, then the Component.js file will be replaced with the default FPM Component.js, otherwise, the existing Component.js stays as-is.
     */
    replaceAppComponent?: boolean;

    /**
     * If set to true, then FCL will be enabled.
     * (Note: if set to false, nothing will be done i.e. FCL is not disabled)
     */
    fcl?: boolean;
}

export const MIN_VERSION = '1.94.0';

/**
 * Enable the flexible programming model for an application.
 *
 * @param {string} basePath - the base path
 * @param {FPMConfig} config - the FPM configuration
 * @param {Editor} [fs] - the mem-fs editor instance
 * @returns {Promise<Editor>} the updated mem-fs editor instance
 */
export function enableFPM(basePath: string, config: FPMConfig = {}, fs?: Editor): Editor {
    if (!fs) {
        fs = create(createStorage());
    }

    const manifestPath = join(basePath, 'webapp/manifest.json');
    const manifest = fs.readJSON(manifestPath) as any as Manifest;

    // add FE libs is not yet added
    if (!manifest['sap.ui5']?.dependencies?.libs?.['sap.fe.templates']) {
        fs.extendJSON(manifestPath, {
            'sap.ui5': {
                dependencies: {
                    libs: {
                        'sap.fe.templates': {}
                    }
                }
            }
        });
    }

    // if a minUI5Version is set and it is smaller than the minimum required, increase it
    if (
        manifest['sap.ui5']?.dependencies.minUI5Version &&
        lt(manifest['sap.ui5']?.dependencies.minUI5Version, MIN_VERSION)
    ) {
        fs.extendJSON(manifestPath, {
            'sap.ui5': {
                dependencies: {
                    minUI5Version: MIN_VERSION
                }
            }
        });
    }
    // enable FCL if requested
    if (config.fcl) {
        fs.extendJSON(manifestPath, {
            'sap.ui5': {
                rootView: {
                    viewName: 'sap.fe.templates.RootContainer.view.Fcl',
                    type: 'XML',
                    async: true,
                    id: 'appRootView'
                },
                routing: {
                    config: {
                        routerClass: FCL_ROUTER
                    }
                }
            }
        });
    }

    // replace Component.js
    if (config.replaceAppComponent) {
        const componentTemplate = join(__dirname, '../../templates/app/Component.js');
        fs.copyTpl(componentTemplate, join(basePath, 'webapp/Component.js'), manifest['sap.app']);
    }

    return fs;
}
