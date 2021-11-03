import { join } from 'path';
import { create as createStorage } from 'mem-fs';
import { create, Editor } from 'mem-fs-editor';
import { render } from 'ejs';

import { enhanceData } from './defaults';
import { CustomPage, InternalCustomPage, Ui5Route } from './types';
import { validateBasePath, validateVersion } from '../common/validate';

/**
 * Validate the UI5 version and if valid return the root folder for the templates to be used.
 *
 * @param ui5Version - optional minimum required UI5 version
 * @returns root folder  containg the templates if the version is supported otherwise throws an error
 */
export function getTemplateRoot(ui5Version?: number): string {
    if (ui5Version === undefined || ui5Version >= 1.94) {
        return join(__dirname, '../../templates/page/1.94');
    } else {
        return join(__dirname, '../../templates/page/1.84');
    }
}

/**
 * Add a new route to the provided route array, and update existing routes if necessary (e.g. if targets are defined as arrays for FCL).
 *
 * @param routes existing application routes (from the manifest)
 * @param config configuration object
 */
function updateRoutes(routes: Ui5Route[], config: InternalCustomPage) {
    const newRoute: Partial<Ui5Route> = {
        name: `${config.entity}${config.name}`
    };
    if (config.navigation) {
        const sourceRoute = routes.find((route) => route.name === config.navigation?.sourcePage);
        newRoute.pattern = `${sourceRoute?.pattern.replace(':?query:', '')}/${config.navigation.navEntity}({${
            config.navigation.navEntity
        }Key}):?query:`;
        if (sourceRoute?.target.constructor === Array) {
            const pages = sourceRoute.target;
            // FCL only supports 3 columns, therefore, show the page in fullscreen if it is the 4th level of navigation
            newRoute.target =
                pages.length > 2 ? [(newRoute as Ui5Route).name] : [...pages, (newRoute as Ui5Route).name];
        } else {
            newRoute.target = newRoute.name;
        }
    } else {
        newRoute.pattern = `${config.entity}({key}):?query:`;
        newRoute.target = newRoute.name;
    }
    routes.push(newRoute as Ui5Route);
}

/**
 * Add a custom page to an existing UI5 application.
 *
 * @param {string} basePath - the base path
 * @param {CustomPage} data - the custom page configuration
 * @param {Editor} [fs] - the memfs editor instance
 * @returns {Promise<Editor>} the updated memfs editor instance
 */
export function generateCustomPage(basePath: string, data: CustomPage, fs?: Editor): Editor {
    validateVersion(data.ui5Version);
    if (!fs) {
        fs = create(createStorage());
    }
    validateBasePath(basePath, fs);

    const manifestPath = join(basePath, 'webapp/manifest.json');
    const config = enhanceData(data, manifestPath, fs);

    // merge content into existing files
    const root = getTemplateRoot(data.ui5Version);

    // enhance manifest.json
    fs.extendJSON(manifestPath, JSON.parse(render(fs.read(join(root, `manifest.json`)), config)), (key, value) => {
        if (key === 'routes') {
            updateRoutes(value as Ui5Route[], config);
        }
        return value;
    });

    // add extension content
    fs.copyTpl(join(root, 'ext/View.xml'), join(config.path, `${config.name}.view.xml`), config);
    fs.copyTpl(join(root, 'ext/Controller.js'), join(config.path, `${config.name}.controller.js`), config);

    return fs;
}
