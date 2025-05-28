import type { AppGenInfo, ExternalParameters } from './types';
import { join } from 'path';
import type { Editor } from 'mem-fs-editor';

/**
 * Generates a README file and .appGenInfo.json at the specified destination path using the provided configuration and file system editor.
 *
 * @param {string} destPath - the desitination path where the info fileswill be created.
 * @param {AppGenInfo} appGenInfo - the configuration object containing the details to be included in the info files.
 * @param {Editor} fs - the file system editor instance used to write the info files.
 * @returns {Editor} the file system editor instance used to write the info files.
 */
export function generateAppGenInfo(destPath: string, appGenInfo: AppGenInfo, fs: Editor): Editor {
    // N.B. This function must stay at this level in the directory structure, i.e one level below 'templates'
    // Apply the configuration to generate the README file
    const templateSourcePath = join(__dirname, '../templates/README.md');
    const templateDestPath = `${destPath}/README.md`;

    const { externalParameters, ...appGenInfoCore } = appGenInfo;

    // Write the README file
    fs.copyTpl(templateSourcePath, templateDestPath, appGenInfoCore);

    const appGenInfoJson: {
        generationParameters: Exclude<AppGenInfo, 'externalParameters'>;
        externalParameters?: ExternalParameters[];
    } = {
        generationParameters: appGenInfoCore
    };

    if (externalParameters) {
        appGenInfoJson.externalParameters = [...externalParameters];
    }

    // Write the .appGenInfo.json file
    fs.writeJSON(`${destPath}/.appGenInfo.json`, appGenInfoJson);

    return fs;
}
