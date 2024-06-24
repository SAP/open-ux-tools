import { t } from './i18n';
import type { ReadMe } from './types';
import { join } from 'path';
import type { Editor } from 'mem-fs-editor';

/**
 * Generates a README file at the specified destination path using the provided configuration and file system editor.
 *
 * @param {string} destPath - The desitination path where the README file will be created.
 * @param {ReadMe} readMe - The configuration object containing the details to be included in the README file.
 * @param {Editor} fs - The file system editor instance used to write the README file.
 * @returns {Editor} The file system editor instance used to write the README file.
 */
export function generateReadMe(destPath: string, readMe: ReadMe, fs: Editor): Editor {
    // Apply the configuration to generate the README file
    const templateSourcePath = join(__dirname, '..', 'templates/README.md');
    const templateDestPath = `${destPath}/README.md`;
    // pass locals with default values to be used in the template
    const locals = {
        genDate: new Date().toString(),
        genPlatform: '',
        metadataFilename: '',
        serviceUrl: 'N/A',
        showMockDataInfo: false,
        additionalEntries: [],
        launchText: t('launchTextDefault')
    };
    // copy template
    fs.copyTpl(templateSourcePath, templateDestPath, { ...locals, ...readMe });
    return fs;
}
