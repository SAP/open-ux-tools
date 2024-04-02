import { join } from 'path';
import { create as createStorage } from 'mem-fs';
import type { Editor } from 'mem-fs-editor';
import { create } from 'mem-fs-editor';
import type { CfWriterConfig, ManifestAppdescr } from '../types';

/**
 * Writes the adp-project template to the mem-fs-editor instance.
 *
 * @param basePath - the base path
 * @param config - the writer configuration
 * @param fs - the memfs editor instance
 * @returns the updated memfs editor instance
 */
export async function generateCf(basePath: string, config: CfWriterConfig, fs?: Editor): Promise<Editor> {
    if (!fs) {
        fs = create(createStorage());
    }
    const tmplPath = join(__dirname, '../../templates/projects/cf');

    fs.copyTpl(join(tmplPath, '**/*.*'), join(basePath), config.app, undefined, {
        globOptions: { dot: true, ignore: ["**/xs-security.json", "**/approuter/*.*", "**/manifest.appdescr_variant"] },
        processDestinationPath: (filePath: string) =>
        filePath
            .replace(/gitignore.tmpl/g, '.gitignore')
            .replace(/i18n\/i18n.properties/g, 'webapp/i18n/i18n.properties')
    });

    // manifest.appdescr_variant
    const appdescrTplPath = join(tmplPath, 'manifest.appdescr_variant');
    const appdescrPath = join(basePath, 'webapp/manifest.appdescr_variant');
    const baseAppdescrContent: ManifestAppdescr = JSON.parse(fs.read(appdescrTplPath));
    config.appdescr.content = [...baseAppdescrContent.content, ...config.appdescr.content];
    Object.assign(baseAppdescrContent, config.appdescr);
    fs.writeJSON(appdescrPath, baseAppdescrContent);
    // .adp/config.json
    const adpConfigPath = join(basePath, '.adp/config.json');
    fs.writeJSON(adpConfigPath, config.adpConfig);
    // approuter
    if (config.app.addStandaloneApprouter) {
        fs.copyTpl(join(tmplPath, '**/*.*'), join(basePath,'approuter'), config.app);
    }
    // xs-security.json
    if (!fs.exists(join(config.app.projectPath, "xs-security.json"))) {
        fs.copyTpl(join(tmplPath, "xs-security.json"), join(config.app.projectPath, "xs-security.json"), {
                projectName: config.app.xsSecurityProjectName
            }
        );
    }

    return fs;
}
