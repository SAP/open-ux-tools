import { join } from 'path';
import { create as createStorage } from 'mem-fs';
import type { Editor } from 'mem-fs-editor';
import { create } from 'mem-fs-editor';
import type { AdpWriterConfig } from '../types';
import { UI5Config } from '@sap-ux/ui5-config';
import { enhanceUI5Yaml, enhanceUI5DeployYaml, hasDeployConfig } from './options';

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
        options: { ...config.options }
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

    fs.copyTpl(join(tmplPath, '**/*.*'), join(basePath), fullConfig, undefined, {
        globOptions: { dot: true },
        processDestinationPath: (filePath: string) => filePath.replace(/gitignore.tmpl/g, '.gitignore')
    });

    // ui5.yaml
    const ui5ConfigPath = join(basePath, 'ui5.yaml');
    const baseUi5ConfigContent = fs.read(ui5ConfigPath);
    const ui5Config = await UI5Config.newInstance(baseUi5ConfigContent);
    enhanceUI5Yaml(ui5Config, fullConfig);
    fs.write(ui5ConfigPath, ui5Config.toString());
    // ui5-deploy.yaml
    if (hasDeployConfig(fullConfig)) {
        const ui5DeployConfig = await UI5Config.newInstance(baseUi5ConfigContent);
        enhanceUI5DeployYaml(ui5DeployConfig, fullConfig);
        fs.write(join(basePath, 'ui5-deploy.yaml'), ui5DeployConfig.toString());
    }

    return fs;
}
