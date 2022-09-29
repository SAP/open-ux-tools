import { create as createStorage } from 'mem-fs';
import type { Editor } from 'mem-fs-editor';
import { create } from 'mem-fs-editor';
import { join } from 'path';
import { lt, valid } from 'semver';
import type { Manifest } from '@sap-ux/project-access';
import { FCL_ROUTER } from '../common/defaults';
import { getTemplatePath } from '../templates';
import { addExtensionTypes } from '../common/utils';

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
    /**
     * If set to true then all code snippets are generated in Typescript instead of Javascript.
     */
    typescript?: boolean;
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
    if (!fs.exists(manifestPath)) {
        throw new Error(`Invalid project folder. Cannot find required file ${manifestPath}`);
    }
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
    const minUI5Version = manifest['sap.ui5']?.dependencies?.minUI5Version;
    if (minUI5Version && valid(minUI5Version) && lt(minUI5Version, MIN_VERSION)) {
        fs.extendJSON(manifestPath, {
            'sap.ui5': {
                dependencies: {
                    minUI5Version: MIN_VERSION
                }
            }
        });
    }

    // add type extensions if required
    if (config.typescript) {
        addExtensionTypes(basePath, manifest['sap.ui5']?.dependencies.minUI5Version, fs);
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
        const ext = config.typescript ? 'ts' : 'js';
        const componentTemplate = getTemplatePath(`/app/Component.${ext}`);
        fs.copyTpl(componentTemplate, join(basePath, `webapp/Component.${ext}`), manifest['sap.app']);
    }

    return fs;
}
