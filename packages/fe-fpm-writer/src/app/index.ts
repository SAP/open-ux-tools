import { create as createStorage } from 'mem-fs';
import type { Editor } from 'mem-fs-editor';
import { create } from 'mem-fs-editor';
import { join } from 'path';
import { satisfies } from 'semver';
import type { SAPJSONSchemaForWebApplicationManifestFile as Manifest } from '../common/manifest';

export interface FPMConfig {
    fcl?: boolean;
}

/**
 * Enable the flexible programming model for an application.
 *
 * @param {string} basePath - the base path
 * @param {CustomTableColumn} config - the custom column configuration
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
        !satisfies(manifest['sap.ui5']?.dependencies.minUI5Version, '>=1.86')
    ) {
        fs.extendJSON(manifestPath, {
            'sap.ui5': {
                dependencies: {
                    minUI5Version: '1.86.0'
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
                        routerClass: 'sap.f.routing.Router'
                    }
                }
            }
        });
    }

    // replace Component.js
    const componentTemplate = join(__dirname, '../../templates/app/Component.js');
    fs.copyTpl(componentTemplate, join(basePath, 'webapp/Component.js'), manifest['sap.app']);

    return fs;
}
