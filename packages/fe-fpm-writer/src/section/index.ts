import { create as createStorage } from 'mem-fs';
import type { Editor } from 'mem-fs-editor';
import { create } from 'mem-fs-editor';
import type { CustomHeaderSection, CustomSection, InternalCustomSection, CustomSubSection } from './types';
import { join } from 'path';
import { render } from 'ejs';
import { validateVersion, validateBasePath } from '../common/validate';
import type { CustomElement, Manifest } from '../common/types';
import { setCommonDefaults, getDefaultFragmentContentData } from '../common/defaults';
import { applyEventHandlerConfiguration } from '../common/event-handler';
import { extendJSON } from '../common/file';
import { getTemplatePath } from '../templates';
import { coerce, gte } from 'semver';

type CustomSectionUnion = CustomHeaderSection | CustomSection | CustomSubSection;

/**
 * Get the template folder for the given UI5 version.
 *
 * @param folderName template folder name.
 * @param ui5Version required UI5 version.
 * @returns path to the template folder containing the manifest.json ejs template
 */
export function getManifestRoot(folderName: string, ui5Version?: string): string {
    const minVersion = coerce(ui5Version);
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
 * @returns String with additional dependencies to add for "FragmentDefinition" element in fragment.xml
 */
function getAdditionalDependencies(ui5Version?: string): string | undefined {
    const minVersion = coerce(ui5Version);
    return !minVersion || gte(minVersion, '1.90.0') ? 'xmlns:macros="sap.fe.macros"' : undefined;
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
        config.eventHandler = applyEventHandlerConfiguration(fs, config, config.eventHandler, {
            controllerSuffix: false,
            typescript: config.typescript
        });
    }

    // generate section content
    if (config.control) {
        config.content = config.control;
    } else {
        Object.assign(
            config,
            getDefaultFragmentContentData(config.name, config.eventHandler, undefined, undefined, false)
        );
    }
    // Additional dependencies to include into 'Fragment.xml'
    config.dependencies = getAdditionalDependencies(config.minUI5Version);

    return config as InternalCustomSection;
}

/**
 * Add a custom section or sub section to an existing UI5 application.
 *
 * @param {string} basePath - the base path
 * @param {CustomSection} customSection - the custom section configuration
 * @param {string} manifestTemplateRoot - path to the template folder containing the manifest.json ejs template
 * @param {Editor} [fs] - the mem-fs editor instance
 * @returns {Promise<Editor>} the updated mem-fs editor instance
 */
function generate(
    basePath: string,
    customSection: CustomSectionUnion,
    manifestTemplateRoot: string,
    fs?: Editor
): { editor: Editor; section: InternalCustomSection } {
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
    const filledTemplate = render(fs.read(join(manifestTemplateRoot, `manifest.json`)), completeSection, {});
    extendJSON(fs, {
        filepath: manifestPath,
        content: filledTemplate,
        tabInfo: customSection.tabInfo
    });

    // add fragment
    const viewPath = join(completeSection.path, `${completeSection.fragmentFile ?? completeSection.name}.fragment.xml`);
    if (!fs.exists(viewPath)) {
        fs.copyTpl(getTemplatePath('common/FragmentWithVBox.xml'), viewPath, completeSection);
    }

    return { editor: fs, section: completeSection };
}

/**
 * Add a custom header section to an existing UI5 application.
 *
 * @param {string} basePath - the base path
 * @param {CustomHeaderSection} customHeaderSection - the custom header section configuration
 * @param {Editor} [fs] - the mem-fs editor instance
 * @returns {Promise<Editor>} the updated mem-fs editor instance
 */
export function generateCustomHeaderSection(
    basePath: string,
    customHeaderSection: CustomHeaderSection,
    fs?: Editor
): Editor {
    if (!fs) {
        fs = create(createStorage());
    }
    const manifestRoot = getManifestRoot('header-section', customHeaderSection.minUI5Version);
    const minVersion = coerce(customHeaderSection.minUI5Version);
    let editSection: (CustomElement & Partial<InternalCustomSection>) | undefined;
    // Prepare 'templateEdit' - apply namespace and folder path resolution
    if (customHeaderSection.edit && (!minVersion || gte(minVersion, '1.86.0'))) {
        editSection = customHeaderSection.edit;
        const manifestPath = join(basePath, 'webapp/manifest.json');
        const manifest = fs.readJSON(manifestPath) as Manifest;
        // Set folder, ns and path for edit fragment
        setCommonDefaults(editSection, manifestPath, manifest);
    }
    // Call standard custom section generation
    const { editor, section } = generate(basePath, customHeaderSection, manifestRoot, fs);
    // Handle 'templateEdit' - edit fragment details
    if (editSection) {
        // Apply event handler for edit fragment
        if (editSection.eventHandler) {
            editSection.eventHandler = applyEventHandlerConfiguration(editor, editSection, editSection.eventHandler, {
                controllerSuffix: false,
                typescript: section.typescript,
                eventHandlerFnName: 'onChange'
            });
        }
        // Generate edit fragment content
        if (editSection.control) {
            editSection.content = editSection.control;
        } else {
            Object.assign(
                editSection,
                getDefaultFragmentContentData(editSection.name, editSection.eventHandler, false, true, false)
            );
        }
        if (editSection.path) {
            const viewPath = join(editSection.path, `${editSection.name}.fragment.xml`);
            if (!editor.exists(viewPath)) {
                editor.copyTpl(getTemplatePath('common/FragmentWithForm.xml'), viewPath, editSection);
            }
        }
    }
    return editor;
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
    const manifestRoot = getManifestRoot('section', customSection.minUI5Version);
    return generate(basePath, customSection, manifestRoot, fs).editor;
}

/**
 * Add a custom sub section to an existing UI5 application.
 *
 * @param {string} basePath - the base path
 * @param {CustomSubSection} customSubSection - the custom sub section configuration
 * @param {Editor} [fs] - the mem-fs editor instance
 * @returns {Promise<Editor>} the updated mem-fs editor instance
 */
export function generateCustomSubSection(basePath: string, customSubSection: CustomSubSection, fs?: Editor): Editor {
    const manifestRoot = getManifestRoot('subsection', customSubSection.minUI5Version);
    return generate(basePath, customSubSection, manifestRoot, fs).editor;
}
