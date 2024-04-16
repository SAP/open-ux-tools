import { join } from 'path';
import type { Editor } from 'mem-fs-editor';
import type { AdpWriterConfig, IWriter } from '../../../types';
import { isAppStudio } from '@sap-ux/btp-utils';
import {
    writeTemplateToFolder,
    writeManifestAppdecr,
    writeUI5Yaml,
    writeUI5DeployYaml
} from '../../../base/project-utils';

export class OnPremWriter implements IWriter<AdpWriterConfig> {
    /**
     * @param {Editor} fs - The filesystem editor instance.
     * @param {string} projectPath - The root path of the project.
     */
    constructor(protected fs: Editor, protected projectPath: string) {}
    /**
     * Set default values for optional properties.
     *
     * @param config configuration provided by the calling middleware
     * @returns enhanced configuration with default values
     */
    protected setDefaults(config: AdpWriterConfig): AdpWriterConfig {
        const configWithDefaults: AdpWriterConfig = {
            app: { ...config.app },
            target: { ...config.target },
            ui5: { ...config.ui5 },
            deploy: config.deploy ? { ...config.deploy } : undefined,
            options: { ...config.options },
            flp: config.flp ? { ...config.flp } : undefined,
            customConfig: config.customConfig ? { ...config.customConfig } : undefined,
            appdescr: config.appdescr ? { ...config.appdescr } : undefined
        };
        configWithDefaults.app.title ??= `Adaptation of ${config.app.reference}`;
        configWithDefaults.app.layer ??= 'CUSTOMER_BASE';

        configWithDefaults.package ??= config.package ? { ...config.package } : {};
        configWithDefaults.package.name ??= config.app.id.toLowerCase().replace(/\./g, '-');
        configWithDefaults.package.description ??= configWithDefaults.app.title;

        return configWithDefaults;
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
        const ignoredFiles = isAppStudio()
            ? ['**/manifest.appdescr_variant']
            : ['**/manifest.appdescr_variant', '**/pom.xml'];

        writeTemplateToFolder(join(tmplPath, '**/*.*'), join(this.projectPath), fullConfig, this.fs, ignoredFiles);
        if (fullConfig.appdescr) {
            writeManifestAppdecr(tmplPath, this.projectPath, fullConfig.appdescr, this.fs);
        }
        await writeUI5Yaml(this.projectPath, fullConfig, this.fs);
        await writeUI5DeployYaml(this.projectPath, fullConfig, this.fs);
    }
}
