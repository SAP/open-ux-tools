import { create as createStorage } from 'mem-fs';
import type { Editor } from 'mem-fs-editor';
import { create } from 'mem-fs-editor';
import { render } from 'ejs';
import { validateVersion, validateBasePath } from '../common/validate';
import { getTemplatePath } from '../templates';
import { getJsonSpace } from '../common/file';
import { getManifest } from '../common/utils';
import { enhanceManifestAndGetActionsElementReference } from '../action';
import { TargetControl, type ActionMenu, type ActionMenuTarget } from './types';

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

    if (actionMenuConfig.target.menuId) {
        // add new action to existing menu
        const actionsContainer = getExistingMenuItemsContainer(manifest, actionMenuConfig.target);
        const actionsList: string[] = actionsContainer[actionMenuConfig.target.menuId].menu;
        actionsList.push(...actionMenuConfig.settings.actions);
    } else {
        // enhance manifest with action menu definition
        const actionsContainer = enhanceManifestAndGetActionsElementReference(manifest, actionMenuConfig.target);
        Object.assign(
            actionsContainer,
            JSON.parse(render(fs.read(getTemplatePath(`action/manifest.action-menu.json`)), actionMenuConfig, {}))
        );
        for (const { key, position } of actionMenuConfig.target.positionUpdates ?? []) {
            if (['__proto__', 'constructor', 'prototype'].includes(key)) {
                // Prevent prototype pollution via special property names
                continue;
            }
            const action = actionsContainer[key] as { [key: string]: unknown };
            if (action) {
                if (position) {
                    action.position = position;
                } else {
                    delete action.position;
                }
            }
        }
    }
    fs.writeJSON(manifestPath, manifest, undefined, getJsonSpace(fs, manifestPath, actionMenuConfig.tabInfo));

    return fs;
}

/**
 * Returns actions manifest entry for a given action menu target control.
 *
 * @param manifest - manifest content
 * @param target - target control
 * @returns - manifest node - container for a menu
 */
function getExistingMenuItemsContainer(manifest: any, target: ActionMenuTarget): any {
    const page = manifest['sap.ui5'].routing.targets[target.page];
    if (target.control === TargetControl.header) {
        return page.options.settings.content[target.control].actions;
    } else if (target.control === TargetControl.body && target.customSectionKey) {
        return page.options.settings.content[target.control].sections[target.customSectionKey].actions;
    } else {
        // Custom actions for other elements are defined in: 'options/settings/controlConfiguration/<element>/actions'
        const controlPrefix = target.navProperty ? target.navProperty + '/' : '';
        const controlSuffix = target.qualifier ? '#' + target.qualifier : '';
        const controlId = `${controlPrefix}${target.control}${controlSuffix}`;
        return page.options.settings.controlConfiguration[controlId].actions;
    }
}
