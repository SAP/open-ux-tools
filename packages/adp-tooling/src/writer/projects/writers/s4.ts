import { join } from 'path';
import type { Editor } from 'mem-fs-editor';
import type { AdpWriterConfig } from '../../../types';
import { OnPremWriter } from './onprem';
import {
    writeManifestAppdecr,
    writeTemplateToFolder,
    writeUI5DeployYaml,
    writeUI5Yaml,
    writeEnvFile
} from './project-utils';

export class S4Writer extends OnPremWriter {
    /**
     * @param {Editor} fs - The filesystem editor instance.
     * @param {string} projectPath - The root path of the project.
     */
    constructor(protected fs: Editor, protected projectPath: string) {
        super(fs, projectPath);
    }

    /**
     * Writes the adp-project template files based on the provided data.
     *
     * @param data - the writer configuration
     * @returns {Promise<void>} A promise that resolves when the project writing process is completed.
     */
    async write(data: AdpWriterConfig): Promise<void> {
        const tmplPath = join(__dirname, '../../../../templates/projects/onprem');
        const fullConfig = this.setDefaults(data);
        const ignoredFiles = ['**/manifest.appdescr_variant'];

        writeTemplateToFolder(join(tmplPath, '**/*.*'), join(this.projectPath), fullConfig, this.fs, ignoredFiles);
        if (fullConfig.appdescr) {
            writeManifestAppdecr(tmplPath, this.projectPath, fullConfig.appdescr, this.fs);
        }
        await writeUI5DeployYaml(this.projectPath, fullConfig, this.fs);
        await writeUI5Yaml(this.projectPath, fullConfig, this.fs);
        await writeEnvFile(this.projectPath, fullConfig, this.fs);
    }
}
