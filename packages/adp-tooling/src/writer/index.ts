import { join } from 'path';
import { create as createStorage } from 'mem-fs';
import { create, type Editor } from 'mem-fs-editor';
import type { AdpWriterConfig } from '../types';
import {
    writeTemplateToFolder,
    writeManifestAppdescr,
    writeUI5Yaml,
    writeUI5DeployYaml,
    writeEnvFile
} from './project-utils';

/**
 * Set default values for optional properties.
 *
 * @param config configuration provided by the calling middleware
 * @returns enhanced configuration with default values
 */
function setDefaults(config: AdpWriterConfig): AdpWriterConfig {
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
 * Writes the adp-project template to the mem-fs-editor instance.
 *
 * @param basePath - the base path
 * @param config - the writer configuration
 * @param fs - the memfs editor instance
 * @returns the updated memfs editor instance
 */
export async function generate(basePath: string, config: AdpWriterConfig, fs?: Editor): Promise<Editor> {
    if (!fs) {
        fs = create(createStorage());
    }

    const tmplPath = join(__dirname, '../../templates/project');
    const fullConfig = setDefaults(config);
    const ignoredFiles = fullConfig.appdescr ? ['**/manifest.appdescr_variant'] : [];

    writeTemplateToFolder(join(tmplPath, '**/*.*'), join(basePath), fullConfig, fs, ignoredFiles);
    if (fullConfig.appdescr) {
        writeManifestAppdescr(tmplPath, basePath, fullConfig.appdescr, fs);
    }
    await writeUI5DeployYaml(basePath, fullConfig, fs);
    await writeUI5Yaml(basePath, fullConfig, fs);
    await writeEnvFile(basePath, fullConfig, fs);

    return fs;
}