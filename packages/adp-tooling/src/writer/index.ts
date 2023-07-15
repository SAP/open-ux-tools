import { join } from 'path';
import { create as createStorage } from 'mem-fs';
import type { Editor } from 'mem-fs-editor';
import { create } from 'mem-fs-editor';
import { AdpWriterConfig } from '../types';
import { UI5Config } from '@sap-ux/ui5-config';

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
    const tmplPath = join(__dirname, '../templates');

    fs.copyTpl(join(tmplPath, 'core', '**/*.*'), join(basePath), config, undefined, {
        globOptions: { dot: true },
        processDestinationPath: (filePath: string) => filePath.replace(/gitignore.tmpl/g, '.gitignore')
    });

    // ui5.yaml
    const ui5ConfigPath = join(basePath, 'ui5.yaml');
    const ui5Config = await UI5Config.newInstance(fs.read(ui5ConfigPath));
    // TODO: add preview middleware
    // TODO: use OSS middleware instead
    ui5Config.addFioriToolsProxydMiddleware({
        ui5: {
            url: config.ui5?.frameworkUrl
        }
    });
    ui5Config.addFioriToolsAppReloadMiddleware();
    fs.write(ui5ConfigPath, ui5Config.toString());

    return fs;
}
