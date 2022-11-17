import { create as createStorage } from 'mem-fs';
import type { Editor } from 'mem-fs-editor';
import { create } from 'mem-fs-editor';
import type { CustomSection, InternalCustomSection, CustomSectionDependencies } from './types';
import { join } from 'path';
import { render } from 'ejs';
import { validateVersion, validateBasePath } from '../common/validate';
import type { Manifest } from '../common/types';
import { setCommonDefaults, getDefaultFragmentContent } from '../common/defaults';
import { applyEventHandlerConfiguration } from '../common/event-handler';
import { getTemplatePath } from '../templates';
import { coerce } from 'semver';

/**
 * Get the template folder for the given UI5 version.
 *
 * @param ui5Version required UI5 version.
 * @returns path to the template folder containing the manifest.json ejs template
 */
export function getManifestRoot(ui5Version?: string): string {
    const minVersion = coerce(ui5Version);
    if (!minVersion || minVersion.minor >= 86) {
        return getTemplatePath('/section/1.86');
    } else {
        return getTemplatePath('/section/1.85');
    }
}

/**
 * Get additional dependencies for fragment.xml template based on passed ui5 version.
 *
 * @param ui5Version required UI5 version.
 * @returns Additional dependencies for fragment.xml
 */
function getAdditionalDependencies(ui5Version?: string): CustomSectionDependencies | undefined {
    const minVersion = coerce(ui5Version);
    return !minVersion || minVersion.minor >= 90 ? { 'xmlns:macros': 'sap.fe.macros' } : undefined;
}

/**
 * Enhances the provided custom section configuration with additonal data.
 *
 * @param {Editor} fs - the mem-fs editor instance
 * @param {CustomSection} data - a custom section configuration object
 * @param {string} manifestPath - path to the project's manifest.json
 * @param {Manifest} manifest - the application manifest
 * @returns enhanced configuration
 */
function enhanceConfig(
    fs: Editor,
    data: CustomSection,
    manifestPath: string,
    manifest: Manifest
): InternalCustomSection {
    const config: CustomSection & Partial<InternalCustomSection> = { ...data };
    setCommonDefaults(config, manifestPath, manifest);

    // Apply event handler
    if (config.eventHandler) {
        config.eventHandler = applyEventHandlerConfiguration(fs, config, config.eventHandler, false, config.typescript);
    }

    // generate section content
    config.content = config.control || getDefaultFragmentContent(config.name, config.eventHandler);
    // Additional dependencies to include into 'Fragment.xml'
    config.dependencies = getAdditionalDependencies(config.minUI5Version);

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
    validateVersion(customSection.minUI5Version);
    if (!fs) {
        fs = create(createStorage());
    }
    validateBasePath(basePath, fs);

    const manifestPath = join(basePath, 'webapp/manifest.json');
    const manifest = fs.readJSON(manifestPath) as Manifest;

    // merge with defaults
    const completeSection = enhanceConfig(fs, customSection, manifestPath, manifest);

    // enhance manifest with section definition
    const manifestRoot = getManifestRoot(customSection.minUI5Version);
    const filledTemplate = render(fs.read(join(manifestRoot, `manifest.json`)), completeSection, {});
    fs.extendJSON(manifestPath, JSON.parse(filledTemplate));

    // add fragment
    const viewPath = join(completeSection.path, `${completeSection.name}.fragment.xml`);
    if (!fs.exists(viewPath)) {
        fs.copyTpl(getTemplatePath('common/Fragment.xml'), viewPath, completeSection);
    }

    return fs;
}
