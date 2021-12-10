import { create as createStorage } from 'mem-fs';
import { create, Editor } from 'mem-fs-editor';
import { CustomSection, InternalCustomSection } from './types';
import { join } from 'path';
import { render } from 'ejs';
import { validateVersion, validateBasePath } from '../common/validate';
import { Manifest } from '../common/types';
import { setCommonDefaults, getDefaultFragmentContent } from '../common/defaults';

/**
 * Enhances the provided custom section configuration with additonal data.
 *
 * @param {CustomSection} data - a custom section configuration object
 * @param {string} manifestPath - path to the project's manifest.json
 * @param {Manifest} manifest - the application manifest
 * @returns enhanced configuration
 */
function enhanceConfig(data: CustomSection, manifestPath: string, manifest: Manifest): InternalCustomSection {
    const config: CustomSection & Partial<InternalCustomSection> = { ...data };
    setCommonDefaults(config, manifestPath, manifest);

    // set default event handler if it is to be created
    if (config.eventHandler === true) {
        config.eventHandler = `${config.ns}.${config.name}.onPress`;
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
    const completeSection = enhanceConfig(customSection, manifestPath, manifest);

    // add event handler if requested
    if (completeSection.eventHandler) {
        fs.copyTpl(
            join(root, 'common/EventHandler.js'),
            join(completeSection.path, `${completeSection.name}.js`),
            completeSection
        );
    }

    // enhance manifest with section definition
    const filledTemplate = render(fs.read(join(root, `section/manifest.section.json`)), completeSection);
    fs.extendJSON(manifestPath, JSON.parse(filledTemplate));

    // add fragment
    const viewPath = join(completeSection.path, `${completeSection.name}.fragment.xml`);
    fs.copyTpl(join(root, 'common/Fragment.xml'), viewPath, completeSection);

    return fs;
}
