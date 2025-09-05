import { create as createStorage } from 'mem-fs';
import type { Editor } from 'mem-fs-editor';
import { create } from 'mem-fs-editor';
import { render } from 'ejs';
import { validateVersion, validateBasePath } from '../common/validate';
import { getTemplatePath } from '../templates';
import { getJsonSpace } from '../common/file';
import { getManifest } from '../common/utils';
import { enhanceManifestAndGetActionsElementReference } from '../action';
import type { ActionMenu } from './types';

/**
 * Enhances the provided custom action configuration with default data.
 *
 * @param {ActionMenu} data - a custom action configuration object
 * @returns enhanced configuration
 */
// function enhanceConfig(data: ActionMenu): ActionMenu {
//     // clone input
//     const config: ActionMenu = {
//         ...data,
//         target: { ...data.target },
//         settings: { ...data.settings }
//     };

//     // set default values for visibility and enabled
//     config.settings.enabled = config.settings.enabled || true;
//     config.settings.visible = config.settings.visible || true;

//     return config as ActionMenu;
// }
/**
 * Add a custom page to an existing UI5 application.
 *
 * @param {string} basePath - the base path
 * @param {ActionMenu} actionMenuConfig - the custom action configuration
 * @param {Editor} [fs] - the memfs editor instance
 * @returns {Promise<Editor>} the updated memfs editor instance
 */
export async function generateActionMenu(basePath: string, actionMenuConfig: ActionMenu, fs?: Editor): Promise<Editor> {
    validateVersion(actionMenuConfig.minUI5Version);
    if (!fs) {
        fs = create(createStorage());
    }
    await validateBasePath(basePath, fs);

    const { path: manifestPath, content: manifest } = await getManifest(basePath, fs);

    // const config = enhanceConfig(actionMenuConfig);

    // enhance manifest with action menu definition
    const actionsContainer = enhanceManifestAndGetActionsElementReference(manifest, actionMenuConfig.target);
    Object.assign(
        actionsContainer,
        JSON.parse(render(fs.read(getTemplatePath(`action/manifest.action-menu.json`)), actionMenuConfig, {}))
    );
    fs.writeJSON(manifestPath, manifest, undefined, getJsonSpace(fs, manifestPath, actionMenuConfig.tabInfo));

    return fs;
}
