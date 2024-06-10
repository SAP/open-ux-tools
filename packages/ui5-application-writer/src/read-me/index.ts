import { ReadMe } from './types';
import type { TemplateWriter, ApplyTemplateFunction } from './types';
import { t } from '../i18n';
import { join } from 'path';
import { Editor } from 'mem-fs-editor';

/**
 * Merges the provided ReadMe configuration with default values to be used by read me templates.
 * 
 * @param {Partial<ReadMe>} readMeConfig - The partial configuration object to merge with defaults.
 * @returns {ReadMe} The merged configuration object with defaults applied.
 */
function mergeWithDefaults(readMeConfig: Partial<ReadMe>): ReadMe {
    const defaults: ReadMe = {
        genDate: new Date().toString(),
        genPlatform: '',
        dataSourceLabel: '',
        metadataFilename: '',
        serviceUrl: 'N/A',
        projectName: '',
        projectTitle: '',
        projectDescription: '',
        projectNamespace: '',
        ui5Theme: '',
        projectUI5Version: '',
        enableCodeAssist: false,
        enableEslint: false,
        enableTypeScript: false,
        showMockDataInfo: false,
        genVersion: '',
        templateLabel: '',
        genId: '',
        additionalEntries: [],
        launchText: t('TEXT_LAUNCH_DEFAULT')
    };

    return { ...defaults, ...readMeConfig };
}

/**
 * Returns a function that writes a template to the file system.
 * @param {object} templateWriter - The template writer object.
 * @param {string} templateWriter.fileName - The name of the file to write.
 * @param {string} templateWriter.destPath - The destination path to write the file to.
 * @param {Editor} templateWriter.fsEditor - The file system editor.
 * @returns The function that writes the template to the file system.
 */
function getTemplateWriter({ fileName, destPath, fsEditor}: TemplateWriter): ApplyTemplateFunction {
    // Determine if the template path is bundled (prod) or not (test)
    const isBundledPath = fsEditor.exists(join(__dirname, '..', 'templates', fileName));
    return <P>(path: string, properties: P): void => {
        // Compute the template source path based on whether it's bundled or not
        const templateSourcePath = join(__dirname, isBundledPath ? '' : '..', '..', 'templates', path);
        // Compute the destination path, removing specific substrings from the path
        const templateDestPath = join(destPath, path.replace(/\.tmpl|-cap-tmpl/g, ''));
        // Copy the template with the provided properties
        fsEditor.copyTpl(templateSourcePath, templateDestPath, properties!);
    };
}

/**
 * Generates a README file at the specified destination path using the provided configuration and file system editor.
 *
 * @param {string} destPath - The desitination path where the README file will be created.
 * @param {Partial<ReadMe>} readMeConfig - The configuration object containing the details to be included in the README file. Properties in this object are optional.
 * @param {Editor} fs - The file system editor instance used to write the README file.
 * @returns {Editor} The file system editor instance used to write the README file.
 *
 * @example
 * const readMeConfig = {
 *     projectName: "MyProject",
 *     projectTitle: "My Project Title",
 *     projectNamespace: "com.example",
 *     projectDescription: "A description of my project.",
 *     ui5Theme: "sap_belize",
 *     projectUI5Version: "1.84.0",
 *     enableCodeAssist: true,
 *     enableEslint: true,
 *     enableTypeScript: false,
 *     genId: "generator-id",
 *     genVersion: "1.0.0",
 *     templateLabel: "List Report Page",
 *     genDate: "2023-06-01",
 *     genPlatform: "Web",
 *     dataSourceLabel: "OData V4",
 *     serviceUrl: "https://example.com/service",
 *     showMockDataInfo: true,
 *     additionalEntries: [
 *         { label: "Custom Entry", value: "Custom Value" }
 *     ],
 *     launchText: "To launch the project, run `npm start`."
 * };
 *
 * generateReadMe("./README.md", readMeConfig, editor);
 */
export function generateReadMe(destPath: string, readMeConfig: Partial<ReadMe>, fs: Editor): Editor {
    const config: ReadMe = mergeWithDefaults(readMeConfig);
    // Apply the configuration to generate the README.md file
    getTemplateWriter({ fileName: 'README.md', destPath, fsEditor: fs })<ReadMe>('README.md', config);
    return fs;
}

export { ReadMe };
