import { render } from 'ejs';
import type { Editor } from 'mem-fs-editor';
import type { UI5LibInput, UI5LibInputTS } from '../types';
import { getFilePaths } from '@sap-ux/project-access';
import { mergeObjects, UI5Config } from '@sap-ux/ui5-config';
import { join } from 'path';
import { gte } from 'semver';

/**
 * Enable typescript for the given input.
 *
 * @param libInput Input required to enable the optional typescript features
 * @param basePath - the base path
 * @param tmplPath - the template path
 * @param fs - the memfs editor instance
 */
export async function enableTypescript(libInput: UI5LibInput, basePath: string, tmplPath: string, fs: Editor) {
    const tsTmplDirPath = join(tmplPath, 'optional', 'typescript');
    const tsTmplFilePaths = await getFilePaths(tsTmplDirPath);

    const tsLibInput: UI5LibInputTS = {
        ...libInput,
        tsTypes: getTypePackageFor(libInput.framework, libInput.frameworkVersion),
        tsTypesVersion: libInput.frameworkVersion
    };

    tsTmplFilePaths.forEach((tsTmplFilePath) => {
        const relPath = tsTmplFilePath.replace(tsTmplDirPath, '');
        const outPath = join(basePath, relPath);
        // Extend or add
        if (!fs.exists(outPath)) {
            fs.copyTpl(tsTmplFilePath, outPath, tsLibInput, undefined, {
                globOptions: { dot: true }
            });
        } else {
            const add = JSON.parse(render(fs.read(tsTmplFilePath), tsLibInput, {}));
            const existingFile = JSON.parse(fs.read(outPath));
            const merged = mergeObjects(existingFile, add);
            fs.writeJSON(outPath, merged);
        }
    });

    // ui5 yaml
    const ui5ConfigPath = join(basePath, 'ui5.yaml');
    const ui5Config = await UI5Config.newInstance(fs.read(ui5ConfigPath));

    ui5Config.updateCustomMiddleware({
        name: 'fiori-tools-appreload',
        afterMiddleware: 'compression',
        configuration: {
            path: 'src',
            port: 35729,
            delay: 300
        }
    });
    ui5Config.updateCustomMiddleware({
        name: 'ui5-tooling-transpile-middleware',
        afterMiddleware: 'compression',
        configuration: {
            debug: true,
            transformModulesToUI5: {
                overridesToOverride: true
            },
            excludePatterns: ['/Component-preload.js']
        }
    });

    ui5Config.addCustomTasks([
        {
            name: 'ui5-tooling-transpile-task',
            afterTask: 'replaceVersion',
            configuration: {
                debug: true,
                transformModulesToUI5: {
                    overridesToOverride: true
                }
            }
        }
    ]);

    // write ts ui5 yaml
    fs.write(ui5ConfigPath, ui5Config.toString());
}

/**
 * Returns the types package depending on ui5 version.
 *
 * @param framework SAPUI5 or OpenUI5
 * @param version ui5 version
 * @returns types package
 */
function getTypePackageFor(framework: 'SAPUI5' | 'OpenUI5', version: string): string {
    const typesName = gte(version, '1.113.0') ? 'types' : 'ts-types-esm';
    return `@${framework.toLowerCase()}/${typesName}`;
}
