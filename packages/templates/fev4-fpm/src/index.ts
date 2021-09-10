import { join } from 'path';
import { create as createStorage } from 'mem-fs';
import { create, Editor } from 'mem-fs-editor';
import { render } from 'ejs';

import { CustomPage, CustomPageConfig, enhanceData } from './data';

/**
 * Validates the provided base path.
 *
 * @param {string} basePath - the base path
 * @param {Editor} fs - the memfs editor instance
 */
function validateBasePath(basePath: string, fs: Editor) {
    [join(basePath, 'webapp', 'manifest.json')].forEach(
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
    
    
    const manifestPath = join(basePath, 'webapp/manifest.json');
    const config = enhanceData(data, manifestPath, fs);
    
    // merge content into existing files
    const root = join(__dirname, '..', 'templates/customPage');

    // enhance manifest.json
    fs.extendJSON(manifestPath, JSON.parse(render(fs.read(join(root, `manifest.json`)), config)));

    // add extension content
    if (data.view.path === undefined) {
        data.view.path = join(basePath, `webapp/ext/view/${config.view.name}.view.xml`);
        fs.copyTpl(
            join(root,'ext/view/CustomPage.view.xml'), 
            data.view.path, config);
        fs.copyTpl(
            join(root,'ext/controller/CustomPage.controller.js'), 
            join(basePath, `webapp/ext/controller/${config.view.name}.controller.js`), config);
    }

    return fs;
}

export { CustomPage, generateCustomPage};
