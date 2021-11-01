import { join } from 'path';
import { create as createStorage } from 'mem-fs';
import { create, Editor } from 'mem-fs-editor';
import { render } from 'ejs';

import { enhanceData } from './defaults';
import { CustomPage, InternalCustomPage, Ui5Route } from './types';
import { getTemplateRoot } from './version';

/**
 * Add a new route to the provided route array, and update existing routes if necessary (e.g. if targets are defined as arrays for FCL).
 *
 * @param routes existing application routes (from the manifest)
 * @param config configuration object
 */
function updateRoutes(routes: Ui5Route[], config: InternalCustomPage) {
    const newRoute: Partial<Ui5Route> = {
        name: `${config.entity}${config.id}`
    };
    if (config.navigation) {
        const sourceRoute = routes.find((route) => route.name === config.navigation?.sourcePage);
        newRoute.pattern = `${sourceRoute?.pattern.replace(':?query:', '')}/${config.navigation.navEntity}({${
            config.navigation.navEntity
        }Key}):?query:`;
        if (sourceRoute?.target.constructor === Array) {
            const pages = sourceRoute.target as string[];
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
 * Validates the provided base path.
 *
 * @param {string} basePath - the base path
 * @param {Editor} fs - the memfs editor instance
 * @returns true if the path is valid, otherwise, throws and error
 */
export function validateBasePath(basePath: string, fs?: Editor): boolean {
    if (!fs) {
        fs = create(createStorage());
    }

    const manifestPath = join(basePath, 'webapp', 'manifest.json');
    if (!fs.exists(manifestPath)) {
        throw new Error(`Invalid project folder. Cannot find required file ${manifestPath}`);
    } else {
        const manifest = fs.readJSON(manifestPath) as any;
        if ((manifest['sap.ui5']?.dependencies?.libs?.['sap.fe.templates'] !== undefined) === false) {
            throw new Error(
                'Dependency sap.fe.templates is missing in the manifest.json. Fiori elements FPM requires the SAP FE libraries.'
            );
        }
    }

    return true;
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
    fs.copyTpl(join(root, 'ext/View.xml'), join(config.path, `${config.id}.view.xml`), config);
    fs.copyTpl(join(root, 'ext/Controller.js'), join(config.path, `${config.id}.controller.js`), config);

    return fs;
}
