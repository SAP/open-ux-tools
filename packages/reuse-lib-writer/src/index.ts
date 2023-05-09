import { join } from 'path';
import { create as createStorage } from 'mem-fs';
import type { Editor } from 'mem-fs-editor';
import { create } from 'mem-fs-editor';
import cloneDeep from 'lodash/cloneDeep';
import type { UI5LibConfig, UI5LibInput } from './types';
import { gte } from 'semver';
import { enableTypescript } from './options';

async function generate(basePath: string, ui5LibConfig: UI5LibConfig, fs?: Editor): Promise<Editor> {
    const reuseLib = cloneDeep(ui5LibConfig);

    if (!fs) {
        fs = create(createStorage());
    }

    const tmplPath = join(__dirname, '..', 'templates');
    const ignoreJSFiles = ['**/src/Example.js', '**/ExampleRenderer.js', '**/library.js'];
    const ignore = reuseLib.typescript ? ignoreJSFiles : ['**/*.ts'];

    const librarynamespace = `${reuseLib.namespace}.${reuseLib.libraryname}`;
    const libConfig: UI5LibInput = {
        ...reuseLib,
        namespaceURI: reuseLib.namespace.split('.').join('/'),
        librarynamespace,
        librarynamespaceURI: librarynamespace.split('.').join('/'),
        librarybasepath:
            librarynamespace
                .split('.')
                .map((_) => '..')
                .join('/') + '/',
        frameworklowercase: reuseLib.framework.toLowerCase()
    };

    basePath = join(basePath, librarynamespace);

    fs.copyTpl(join(tmplPath, 'common', '**/*.*'), basePath, libConfig, undefined, {
        globOptions: { dot: true, ignore },
        processDestinationPath: (filePath: string) => {
            return filePath.replace(/^_/, '').replace('baselibrary', libConfig.librarynamespaceURI).replace(/\/_/, '/');
        }
    });

    if (reuseLib.typescript) {
        const tsLibConfig = {
            ...libConfig,
            tstypes: getTypePackageFor(libConfig.framework, libConfig.frameworkVersion),
            tstypesVersion: libConfig.frameworkVersion
        };

        await enableTypescript(tsLibConfig, basePath, tmplPath, fs);
    }

    return fs;
}

function getTypePackageFor(framework: 'SAPUI5' | 'OpenUI5', version: string) {
    const typesName = gte(version, '1.113.0') ? 'types' : 'ts-types-esm';
    return `@${framework.toLowerCase()}/${typesName}`;
}

export { generate, UI5LibConfig };
