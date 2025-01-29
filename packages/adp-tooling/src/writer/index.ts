import { join } from 'path';
import { create as createStorage } from 'mem-fs';
import { create, type Editor } from 'mem-fs-editor';
import type { AdpWriterConfig, InternalInboundNavigation } from '../types';
import { enhanceManifestChangeContentWithFlpConfig } from './options';
import { writeTemplateToFolder, writeUI5Yaml, writeUI5DeployYaml } from './project-utils';

const baseTmplPath = join(__dirname, '../../templates');

/**
 * Set default values for optional properties.
 *
 * @param config configuration provided by the calling middleware
 * @returns enhanced configuration with default values
 */
function setDefaults(config: AdpWriterConfig): AdpWriterConfig {
    const configWithDefaults: AdpWriterConfig & { flp?: InternalInboundNavigation } = {
        app: { ...config.app },
        target: { ...config.target },
        ui5: { ...config.ui5 },
        deploy: config.deploy ? { ...config.deploy } : undefined,
        options: { ...config.options },
        flp: config.flp ? ({ ...config.flp } as InternalInboundNavigation) : undefined,
        customConfig: config.customConfig ? { ...config.customConfig } : undefined
    };
    configWithDefaults.app.title ??= `Adaptation of ${config.app.reference}`;
    configWithDefaults.app.layer ??= 'CUSTOMER_BASE';

    configWithDefaults.package ??= config.package ? { ...config.package } : {};
    configWithDefaults.package.name ??= config.app.id.toLowerCase().replace(/\./g, '-');
    configWithDefaults.package.description ??= configWithDefaults.app.title;

    if (configWithDefaults.flp && !configWithDefaults.flp.inboundId) {
        configWithDefaults.flp.addInboundId = true;
        configWithDefaults.flp.inboundId = `${configWithDefaults.app.id}.InboundID`;
    }

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

    const fullConfig = setDefaults(config);

    if (fullConfig.customConfig?.adp.environment === 'C' && fullConfig.flp) {
        enhanceManifestChangeContentWithFlpConfig(
            fullConfig.flp as InternalInboundNavigation,
            fullConfig.app.id,
            fullConfig.app.content
        );
    }
    writeTemplateToFolder(baseTmplPath, join(basePath), fullConfig, fs);
    await writeUI5DeployYaml(basePath, fullConfig, fs);
    await writeUI5Yaml(basePath, fullConfig, fs);

    return fs;
}

/**
 * Writes the adp-project template to the mem-fs-editor instance during migration.
 *
 * @param basePath - the base path
 * @param config - the writer configuration
 * @param fs - the memfs editor instance
 * @returns the updated memfs editor instance
 */
export async function migrate(basePath: string, config: AdpWriterConfig, fs?: Editor): Promise<Editor> {
    if (!fs) {
        fs = create(createStorage());
    }

    const fullConfig = setDefaults(config);

    const tmplPath = join(baseTmplPath, 'project');

    // Copy the specified files to target project
    fs.copyTpl(join(tmplPath, '**/ui5.yaml'), join(basePath), fullConfig, undefined, {
        globOptions: { dot: true }
    });
    fs.copyTpl(join(tmplPath, '**/package.json'), join(basePath), fullConfig, undefined, {
        globOptions: { dot: true }
    });
    fs.copyTpl(join(tmplPath, '**/gitignore.tmpl'), join(basePath), fullConfig, undefined, {
        globOptions: { dot: true },
        processDestinationPath: (filePath: string) => filePath.replace(/gitignore.tmpl/g, '.gitignore')
    });

    // delete .che folder
    if (fs.exists(join(basePath, '.che/project.json'))) {
        fs.delete(join(basePath, '.che/*'));
    }

    // delete neo-app.json
    if (fs.exists(join(basePath, 'neo-app.json'))) {
        fs.delete(join(basePath, 'neo-app.json'));
    }

    await writeUI5Yaml(basePath, fullConfig, fs);
    await writeUI5DeployYaml(basePath, fullConfig, fs);

    return fs;
}
