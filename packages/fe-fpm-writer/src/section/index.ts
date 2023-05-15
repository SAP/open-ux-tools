import { create as createStorage } from 'mem-fs';
import type { Editor } from 'mem-fs-editor';
import { create } from 'mem-fs-editor';
import type { CustomSection, InternalCustomSection, CustomSectionDependencies, CustomSubSection } from './types';
import { join } from 'path';
import { render } from 'ejs';
import { validateVersion, validateBasePath } from '../common/validate';
import type { Manifest } from '../common/types';
import { setCommonDefaults, getDefaultFragmentContent } from '../common/defaults';
import { applyEventHandlerConfiguration } from '../common/event-handler';
import { extendJSON } from '../common/file';
import { getTemplatePath } from '../templates';
import { coerce, gte } from 'semver';

type CustomSectionUnion = CustomSection | CustomSubSection;

/**
 * Get the template folder for the given UI5 version.
 *
 * @param ui5Version required UI5 version.
 * @param subSection requested template is for sub section.
 * @returns path to the template folder containing the manifest.json ejs template
 */
export function getManifestRoot(ui5Version?: string, subSection = false): string {
    const minVersion = coerce(ui5Version);
    const folderName = subSection ? 'subsection' : 'section';
    if (!minVersion || gte(minVersion, '1.86.0')) {
        return getTemplatePath(`/${folderName}/1.86`);
    } else {
        return getTemplatePath(`/${folderName}/1.85`);
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
    return !minVersion || gte(minVersion, '1.90.0') ? { 'xmlns:macros': 'sap.fe.macros' } : undefined;
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
    data: CustomSectionUnion,
    manifestPath: string,
    manifest: Manifest
): InternalCustomSection {
    const config: CustomSectionUnion & Partial<InternalCustomSection> = { ...data };
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
 * Add a custom section or sub section to an existing UI5 application.
 *
 * @param {string} basePath - the base path
 * @param {CustomSection} customSection - the custom section configuration
 * @param {Editor} [fs] - the mem-fs editor instance
 * @returns {Promise<Editor>} the updated mem-fs editor instance
 */
function generate(basePath: string, customSection: CustomSectionUnion, fs?: Editor): Editor {
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
    const isSubsection = 'parentSection' in completeSection;
    const manifestRoot = getManifestRoot(customSection.minUI5Version, isSubsection);
    const filledTemplate = render(fs.read(join(manifestRoot, `manifest.json`)), completeSection, {});
    extendJSON(fs, {
        filepath: manifestPath,
        content: filledTemplate,
        tabInfo: customSection.tabInfo
    });

    // add fragment
    const viewPath = join(completeSection.path, `${completeSection.name}.fragment.xml`);
    if (!fs.exists(viewPath)) {
        fs.copyTpl(getTemplatePath('common/Fragment.xml'), viewPath, completeSection);
    }

    return fs;
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
    return generate(basePath, customSection, fs);
}

/**
 * Add a custom sub section to an existing UI5 application.
 *
 * @param {string} basePath - the base path
 * @param {CustomSection} customSection - the custom section configuration
 * @param {Editor} [fs] - the mem-fs editor instance
 * @returns {Promise<Editor>} the updated mem-fs editor instance
 */
export function generateCustomSubSection(basePath: string, customSection: CustomSubSection, fs?: Editor): Editor {
    return generate(basePath, customSection, fs);
}
