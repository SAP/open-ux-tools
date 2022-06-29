import { create as createStorage } from 'mem-fs';
import type { Editor } from 'mem-fs-editor';
import { create } from 'mem-fs-editor';
import type { CustomSection, InternalCustomSection } from './types';
import { join } from 'path';
import { render } from 'ejs';
import { validateVersion, validateBasePath } from '../common/validate';
import type { Manifest } from '../common/types';
import { setCommonDefaults, getDefaultFragmentContent } from '../common/defaults';
import { applyEventHandlerConfiguration } from '../common/event-handler';

/**
 * Get the template folder for the given UI5 version.
 *
 * @param root root path to templates folder.
 * @param ui5Version required UI5 version.
 * @returns path to the template folder containing the manifest.json ejs template
 */
export function getManifestRoot(root: string, ui5Version?: number): string {
    let subFolder = '1.86';
    if (ui5Version !== undefined && ui5Version < 1.86) {
        // Old
        subFolder = '1.85';
    }
    return join(root, 'section', subFolder);
}

/**
 * Enhances the provided custom section configuration with additonal data.
 *
 * @param {Editor} fs - the mem-fs editor instance
 * @param {string} root - root path
 * @param {CustomSection} data - a custom section configuration object
 * @param {string} manifestPath - path to the project's manifest.json
 * @param {Manifest} manifest - the application manifest
 * @returns enhanced configuration
 */
function enhanceConfig(
    fs: Editor,
    root: string,
    data: CustomSection,
    manifestPath: string,
    manifest: Manifest
): InternalCustomSection {
    const config: CustomSection & Partial<InternalCustomSection> = { ...data };
    setCommonDefaults(config, manifestPath, manifest);

    // add event handler if requested
    if (typeof config.eventHandler === 'object' || config.eventHandler === true) {
        config.eventHandler = applyEventHandlerConfiguration(fs, root, config, config.eventHandler);
    }

    // generate section content
    config.content = config.control || getDefaultFragmentContent(config.name, config.eventHandler);

    return config as InternalCustomSection;
}

/**
 * Add a custom section to an existing UI5 application.
 *
 * @param {string} basePath - the base path
 * @param {CustomSection} customSection - the custom section configuration
 * @param {Editor} [fs] - the mem-fs editor instance
 * @returns {Promise<Editor>} the updated mem-fs editor instance
 */
export function generateCustomSection(basePath: string, customSection: CustomSection, fs?: Editor): Editor {
    validateVersion(customSection.ui5Version);
    if (!fs) {
        fs = create(createStorage());
    }
    validateBasePath(basePath, fs);

    const manifestPath = join(basePath, 'webapp/manifest.json');
    const manifest = fs.readJSON(manifestPath) as Manifest;

    const root = join(__dirname, '../../templates');

    // merge with defaults
    const completeSection = enhanceConfig(fs, root, customSection, manifestPath, manifest);

    // enhance manifest with section definition
    const manifestRoot = getManifestRoot(root, customSection.ui5Version);
    const filledTemplate = render(fs.read(join(manifestRoot, `manifest.json`)), completeSection);
    fs.extendJSON(manifestPath, JSON.parse(filledTemplate));

    // add fragment
    const viewPath = join(completeSection.path, `${completeSection.name}.fragment.xml`);
    if (!fs.exists(viewPath)) {
        fs.copyTpl(join(root, 'common/Fragment.xml'), viewPath, completeSection);
    }

    return fs;
}
