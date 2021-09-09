import { join } from 'path';
import { create as createStorage } from 'mem-fs';
import { create, Editor } from 'mem-fs-editor';
import { render } from 'ejs';

import { CustomPage, enhanceData } from './data';

/**
 * Validates the provided base path.
 *
 * @param {string} basePath - the base path
 * @param {Editor} fs - the memfs editor instance
 */
function validateBasePath(basePath: string, fs: Editor) {
    [join(basePath, 'package.json'), join(basePath, 'webapp', 'manifest.json')].forEach(
        (path) => {
            if (!fs.exists(path)) {
                throw new Error(`Invalid project folder. Cannot find required file ${path}`);
            }
        }
    );
}
/**
 * Writes the template to the memfs editor instance.
 *
 * @param {string} basePath - the base path
 * @param {CustomPage} data - the custom page configuration
 * @param {Editor} [fs] - the memfs editor instance
 * @returns {Promise<Editor>} the updated memfs editor instance
 */
async function generateCustomPage(basePath: string, data: CustomPage, fs?: Editor): Promise<Editor> {
    if (!fs) {
        fs = create(createStorage());
    }
    validateBasePath(basePath, fs);
    enhanceData(data);

    // merge content into existing files
    const extRoot = join(__dirname, '..', 'templates', 'extend');

    // manifest.json
    const manifestPath = join(basePath, 'webapp', 'manifest.json');
    fs.extendJSON(manifestPath, JSON.parse(render(fs.read(join(extRoot, `manifest.json`)), data)));

    return fs;
}

export { CustomPage, generateCustomPage};
