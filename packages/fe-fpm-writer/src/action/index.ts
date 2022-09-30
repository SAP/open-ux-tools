import { create as createStorage } from 'mem-fs';
import type { Editor } from 'mem-fs-editor';
import { create } from 'mem-fs-editor';
import type { CustomAction, CustomActionTarget, InternalCustomAction } from './types';
import { TargetControl } from './types';
import { join } from 'path';
import { render } from 'ejs';
import { validateVersion, validateBasePath } from '../common/validate';
import type { Manifest } from '../common/types';
import { setCommonDefaults } from '../common/defaults';
import { applyEventHandlerConfiguration, contextParameter } from '../common/event-handler';
import { getTemplatePath } from '../templates';

/**
 * Enhances the provided custom action configuration with default data.
 *
 * @param {CustomAction} data - a custom action configuration object
 * @param {string} manifestPath - path to the project's manifest.json
 * @param {Manifest} manifest - the application manifest
 * @returns enhanced configuration
 */
function enhanceConfig(data: CustomAction, manifestPath: string, manifest: Manifest): InternalCustomAction {
    // clone input
    const config: CustomAction & Partial<InternalCustomAction> = {
        ...data,
        target: { ...data.target },
        settings: { ...data.settings }
    };
    setCommonDefaults(config, manifestPath, manifest);

    // set default values for visibility and enabled
    config.settings.enabled = config.settings.enabled || true;
    config.settings.visible = config.settings.visible || true;

    return config as InternalCustomAction;
}

/**
 * Enhance the target object in the manifest with the required nested objects and return a reference to it.
 *
 * @param {Manifest} manifest - the application manifest
 * @param {CustomActionTarget} target - target element
 * @returns Actions object of the given target element.
 */
export function enhanceManifestAndGetActionsElementReference(manifest: any, target: CustomActionTarget): any {
    const page = manifest['sap.ui5'].routing.targets[target.page];
    page.options = page.options || {};
    page.options.settings = page.options.settings || {};
    if (target.control === TargetControl.header || target.control === TargetControl.footer) {
        page.options.settings.content = page.options.settings.content || {};
        page.options.settings.content[target.control] = page.options.settings.content[target.control] || {};
        page.options.settings.content[target.control].actions =
            page.options.settings.content[target.control].actions || {};
        return page.options.settings.content[target.control].actions;
    } else {
        const controlPrefix = target.navProperty ? target.navProperty + '/' : '';
        const controlSuffix = target.qualifier ? '#' + target.qualifier : '';
        const controlId = `${controlPrefix}${target.control}${controlSuffix}`;
        page.options.settings.controlConfiguration = page.options.settings.controlConfiguration || {};
        page.options.settings.controlConfiguration[controlId] =
            page.options.settings.controlConfiguration[controlId] || {};
        page.options.settings.controlConfiguration[controlId].actions =
            page.options.settings.controlConfiguration[controlId].actions || {};
        return page.options.settings.controlConfiguration[controlId].actions;
    }
}

/**
 * Add a custom page to an existing UI5 application.
 *
 * @param {string} basePath - the base path
 * @param {CustomAction} actionConfig - the custom action configuration
 * @param {Editor} [fs] - the memfs editor instance
 * @returns {Promise<Editor>} the updated memfs editor instance
 */
export function generateCustomAction(basePath: string, actionConfig: CustomAction, fs?: Editor): Editor {
    validateVersion(actionConfig.minUI5Version);
    if (!fs) {
        fs = create(createStorage());
    }
    validateBasePath(basePath, fs);

    const manifestPath = join(basePath, 'webapp/manifest.json');
    const manifest = fs.readJSON(manifestPath) as Manifest;

    const config = enhanceConfig(actionConfig, manifestPath, manifest);

    // Apply event handler
    if (config.eventHandler) {
        config.eventHandler = applyEventHandlerConfiguration(
            fs,
            config,
            config.eventHandler,
            false,
            config.typescript,
            contextParameter
        );
    }

    // enhance manifest with action definition and controller reference
    const actions = enhanceManifestAndGetActionsElementReference(manifest, config.target);
    Object.assign(actions, JSON.parse(render(fs.read(getTemplatePath(`action/manifest.action.json`)), config, {})));
    fs.writeJSON(manifestPath, manifest);

    return fs;
}
