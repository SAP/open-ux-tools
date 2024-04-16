import { join } from 'path';
import type { Editor } from 'mem-fs-editor';
import type { CfWriterConfig, IWriter } from '../../../types';
import {
    writeTemplateToFolder,
    writeManifestAppdecr,
    writeXsSecurity,
    writeAdpConfig,
    writeApprouterTemplate
} from '../../../base/project-utils';

export class CfWriter implements IWriter<CfWriterConfig> {
    /**
     * @param {Editor} fs - The filesystem editor instance.
     * @param {string} projectPath - The root path of the project.
     */
    constructor(private fs: Editor, private projectPath: string) {}

    /**
     * Writes the adp-project template files based on the provided data.
     *
     * @param data - the writer configuration
     * @returns {Promise<void>} A promise that resolves when the project writing process is completed.
     */
    async write(data: CfWriterConfig): Promise<void> {
        const tmplPath = join(__dirname, '../../../../templates/projects/cf');
        const ignoredFiles = ['**/xs-security.json', '**/approuter/*.*', '**/manifest.appdescr_variant'];

        writeTemplateToFolder(join(tmplPath, '**/*.*'), join(this.projectPath), data.app, this.fs, ignoredFiles);
        writeApprouterTemplate(tmplPath, this.projectPath, data.app, this.fs);
        writeManifestAppdecr(tmplPath, this.projectPath, data.appdescr, this.fs);
        writeXsSecurity(tmplPath, data.app, this.fs);
        writeAdpConfig(this.projectPath, data.adpConfig, this.fs);
    }
}
