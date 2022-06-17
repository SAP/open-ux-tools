import { join } from 'path';
import { create as createStorage } from 'mem-fs';
import type { Editor } from 'mem-fs-editor';
import { create } from 'mem-fs-editor';
import { render } from 'ejs';
import { getFclConfig, getManifestJsonExtensionHelper, validatePageConfig } from './common';
import type { Manifest } from '../common/types';
import type { ListReport, InternalListReport } from './types';

/**
 * Add a ListReport to an existing UI5 application.
 *
 * @param basePath - the base path
 * @param data - the object page configuration
 * @param fs - the memfs editor instance
 * @returns the updated memfs editor instance
 */
export function generate(basePath: string, data: ListReport, fs?: Editor): Editor {
    if (!fs) {
        fs = create(createStorage());
    }
    validatePageConfig(basePath, data, fs);

    const manifestPath = join(basePath, 'webapp/manifest.json');
    const manifest = fs.readJSON(manifestPath) as Manifest;

    const config: InternalListReport = { ...data, name: 'ListReport', ...getFclConfig(manifest) };

    // enhance manifest.json
    fs.extendJSON(
        manifestPath,
        JSON.parse(render(fs.read(join(__dirname, '../../templates/page/list/manifest.json')), config)),
        getManifestJsonExtensionHelper(config)
    );

    return fs;
}
