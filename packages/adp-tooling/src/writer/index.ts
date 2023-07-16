import { join } from 'path';
import { create as createStorage } from 'mem-fs';
import type { Editor } from 'mem-fs-editor';
import { create } from 'mem-fs-editor';
import { AdpPreviewConfig, AdpWriterConfig } from '../types';
import { UI5Config } from '@sap-ux/ui5-config';

function setDefaults(config: AdpWriterConfig): AdpWriterConfig {
    const configWithDefaults: AdpWriterConfig = {
        app: { ...config.app },
        target: { ...config.target },
        ui5: { ...config.ui5 }
    };
    configWithDefaults.app.title ??= `Adaptation of ${config.app.reference}`;

    configWithDefaults.package ??= config.package ? { ...config.package } : {}
    configWithDefaults.package.name ??= config.app.id.toLowerCase().replace(/./g, "-");
    configWithDefaults.package.description ??= configWithDefaults.app.title;

    return configWithDefaults;
}

/**
 * Writes the adp-project template to the memfs editor instance.
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
    const tmplPath = join(__dirname, '../../templates');
    const fullConfig = setDefaults(config);

    fs.copyTpl(join(tmplPath, '**/*.*'), join(basePath), fullConfig, undefined, {
        globOptions: { dot: true },
        processDestinationPath: (filePath: string) => filePath.replace(/gitignore.tmpl/g, '.gitignore')
    });

    // ui5.yaml
    const ui5ConfigPath = join(basePath, 'ui5.yaml');
    const ui5Config = await UI5Config.newInstance(fs.read(ui5ConfigPath));
    ui5Config.addCustomMiddleware([
        {
            name: 'fiori-tools-appreload',
            configuration: {}
        },
        { 
            name: 'preview-middleware',
            configuration: {
                adp: {
                    target: fullConfig.target,
                    strictSsl: false
                } as AdpPreviewConfig
            }
        },       
        { 
            name: 'ui5-proxy-middleware',
            afterMiddleware: 'preview-middleware',
            configuration: {
              ui5: {
                path: [
                    '/resources',
                    '/test-resources'
                ],
                url: 'https://ui5.sap.com'
              }
            }
        },
        { 
            name: 'backend-proxy-middleware',
            afterMiddleware: 'preview-middleware',
            configuration: {
                backend: {
                    ...fullConfig.target,
                    path: '/sap'
                }
            }
        }
    ]);
    fs.write(ui5ConfigPath, ui5Config.toString());

    return fs;
}
