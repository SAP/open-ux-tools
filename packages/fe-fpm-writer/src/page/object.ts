import { join } from 'path';
import { create as createStorage } from 'mem-fs';
import type { Editor } from 'mem-fs-editor';
import { create } from 'mem-fs-editor';
import { render } from 'ejs';
import { getFclConfig, getManifestJsonExtensionHelper, validatePageConfig } from './common';
import type { Manifest } from '../common/types';
import type { ObjectPage, InternalObjectPage } from './types';

/**
 * Add an object page to an existing UI5 application.
 *
 * @param basePath - the base path
 * @param data - the object page configuration
 * @param fs - the memfs editor instance
 * @returns the updated memfs editor instance
 */
export function generate(basePath: string, data: ObjectPage, fs?: Editor): Editor {
    if (!fs) {
        fs = create(createStorage());
    }
    validatePageConfig(basePath, data, fs);

    const manifestPath = join(basePath, 'webapp/manifest.json');
    const manifest = fs.readJSON(manifestPath) as Manifest;

    const config: InternalObjectPage = { ...data, name: 'ObjectPage', ...getFclConfig(manifest, data.navigation) };

    // enhance manifest.json
    fs.extendJSON(
        manifestPath,
        JSON.parse(render(fs.read(join(__dirname, '../../templates/page/object/manifest.json')), config)),
        getManifestJsonExtensionHelper(config)
    );

    return fs;
}
