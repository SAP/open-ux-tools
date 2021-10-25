import { validateVersion } from '../common/version';
import { create as createStorage } from 'mem-fs';
import { create, Editor } from 'mem-fs-editor';
import { ControlType, CustomAction, CustomActionTarget, InternalCustomAction } from './types';
import { join } from 'path';
import { render } from 'ejs';

/**
 * Enhances the provided custom action configuration with default data.
 *
 * @param {CustomAction} data - a custom action configuration object
 * @param manifest - the application manifest
 * @param fs - mem-fs reference to be used for file access
 * @returns enhanced configuration
 */
function enhanceConfig(data: CustomAction, manifest: any, fs: Editor): InternalCustomAction {
    // clone input data
    const config: InternalCustomAction = {
        name: data.name,
        target: { ...data.target },
        controller: `${manifest['sap.app'].id}.ext.${data.name}`,
        settings: {
            ...data.settings
        }
    };

    // set default values for visibility and enabled
    config.settings.enabled = config.settings.enabled || true;
    config.settings.visible = config.settings.visible || true;

    return config;
}

export function getTargetElementReference(manifest: any, target: CustomActionTarget): any {
    const page = manifest['sap.ui5'].routing.targets[target.page];
    page.options = page.options || {};
    if (target.control === ControlType.header || target.control === ControlType.footer) {
        page.options.content = page.options.content || {};
        page.options.content[target.control] = page.options.content[target.control] || {};
        page.options.content[target.control].actions = page.options.content[target.control].actions || {};
        return page.options.content[target.control].actions;
    } else {
        const controlId = `${target.control}${target.qualifier ? '#' + target.qualifier : ''}`;
        page.options.controlConfiguration = page.options.controlConfiguration || {};
        page.options.controlConfiguration[controlId] = page.options.controlConfiguration[controlId] || {};
        page.options.controlConfiguration[controlId].actions =
            page.options.controlConfiguration[controlId].actions || {};
        return page.options.controlConfiguration[controlId].actions;
    }
}

/**
 * Add a custom page to an existing UI5 application.
 *
 * @param {string} basePath - the base path
 * @param {CustomAction} actionConfig - the custom action configuration
 * @param {Number} ui5Version - optional parameter to define the minimum UI5 version that the generated code must support. If nothing can be generated for the given version then an exception is thrown.
 * @param {Editor} [fs] - the memfs editor instance
 * @returns {Promise<Editor>} the updated memfs editor instance
 */
export function generateCustomAction(
    basePath: string,
    actionConfig: CustomAction,
    ui5Version?: number,
    fs?: Editor
): Editor {
    validateVersion(ui5Version);
    if (!fs) {
        fs = create(createStorage());
    }

    const manifestPath = join(basePath, 'webapp/manifest.json');
    const manifest: any = fs.readJSON(manifestPath);

    const config = enhanceConfig(actionConfig, manifest, fs);

    const root = join(__dirname, '../../templates/action');

    // enhance manifest with action definition and controller reference
    Object.assign(
        getTargetElementReference(manifest, config.target),
        JSON.parse(render(fs.read(join(root, `manifest.action.json`)), config))
    );
    fs.writeJSON(manifestPath, manifest);
    fs.extendJSON(manifestPath, JSON.parse(render(fs.read(join(root, `manifest.json`)), config)));

    // add controller extension
    fs.copyTpl(join(root, 'ext/Controller.js'), join(basePath, 'webapp/ext', `${config.name}.controller.js`), config);

    return fs;
}
