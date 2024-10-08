import { create as createStorage } from 'mem-fs';
import type { Editor } from 'mem-fs-editor';
import { create } from 'mem-fs-editor';
import { join } from 'path';
import { lt, valid } from 'semver';
import { getMinUI5VersionAsArray, getMinimumUI5Version, type Manifest } from '@sap-ux/project-access';
import { FCL_ROUTER } from '../common/defaults';
import { getTemplatePath } from '../templates';
import { addExtensionTypes, getManifest } from '../common/utils';

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
 * If a minUI5Version is set and it is smaller than the minimum required, increase it.
 *
 * @param {Manifest} manifest - content of the mnaifest.json
 * @param {Editor} fs - the mem-fs editor instance
 * @param {string} manifestPath - path to the manifest.json file
 */
function adaptMinUI5Version(manifest: Manifest, fs: Editor, manifestPath: string) {
    const minUI5VersionArray = getMinUI5VersionAsArray(manifest, true);
    if (minUI5VersionArray?.length > 0) {
        let update = false;
        for (let index = 0; index < minUI5VersionArray.length; index++) {
            const minUI5Version = minUI5VersionArray[index];
            if (minUI5Version && valid(minUI5Version) && lt(minUI5Version, MIN_VERSION)) {
                minUI5VersionArray[index] = MIN_VERSION;

                update = true;
            }
        }
        if (update) {
            if (minUI5VersionArray.length === 1) {
                fs.extendJSON(manifestPath, {
                    'sap.ui5': {
                        dependencies: {
                            minUI5Version: minUI5VersionArray[0]
                        }
                    }
                });
            } else if (minUI5VersionArray.length > 1) {
                fs.extendJSON(manifestPath, {
                    'sap.ui5': {
                        dependencies: {
                            minUI5Version: minUI5VersionArray
                        }
                    }
                });
            }
        }
    }
}

/**
 * Enable the flexible programming model for an application.
 *
 * @param {string} basePath - the base path
 * @param {FPMConfig} config - the FPM configuration
 * @param {Editor} [fs] - the mem-fs editor instance
 * @returns {Promise<Editor>} the updated mem-fs editor instance
 */
export async function enableFPM(basePath: string, config: FPMConfig = {}, fs?: Editor): Promise<Editor> {
    if (!fs) {
        fs = create(createStorage());
    }

    const { path: manifestPath, content: manifest } = await getManifest(basePath, fs);

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
    adaptMinUI5Version(manifest, fs, manifestPath);

    // add type extensions if required
    if (config.typescript) {
        addExtensionTypes(basePath, getMinimumUI5Version(manifest), fs);
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
