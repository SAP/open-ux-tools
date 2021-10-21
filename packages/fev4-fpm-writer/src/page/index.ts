import { join, dirname } from 'path';
import { create as createStorage } from 'mem-fs';
import { create, Editor } from 'mem-fs-editor';
import { render } from 'ejs';

import { CustomPage, CustomPageConfig, Ui5Route } from '../types';

/**
 * Enhances the provided custom page configuration with default data.
 *
 * @param {CustomPage} data - a custom page configuration object
 * @param manifestPath - path to the application manifest
 * @param fs - mem-fs reference to be used for file access
 * @returns enhanced configuration
 */
function enhanceData(data: CustomPage, manifestPath: string, fs: Editor): CustomPageConfig {
    // enforce naming conventions
    const firstChar = data.name[0];
    const nameForId = firstChar.toLocaleLowerCase() + data.name.substring(1);
    data.name = firstChar.toUpperCase() + data.name.substring(1);

    const manifest: any = fs.readJSON(manifestPath);
    const config: CustomPageConfig = {
        ...data,
        id: `${manifest['sap.app'].id}.ext.${nameForId}`,
        path: join(dirname(manifestPath), 'ext', nameForId)
    };
    if (config.view === undefined) {
        config.view = {
            title: config.name
        };
    }
    return config;
}

/**
 * Add a new route to the provided route array, and update existing routes if necessary (e.g. if targets are defined as arrays for FCL).
 *
 * @param routes existing application routes (from the manifest)
 * @param config configuration object
 */
function updateRoutes(routes: Ui5Route[], config: CustomPageConfig) {
    const newRoute: Partial<Ui5Route> = {
        name: `${config.entity}${config.name}`
    };
    if (config.navigation) {
        newRoute.pattern = `${config.navigation.sourceEntity}({key})/${config.navigation.navEntity}({key2}):?query:`;
        const sourceRoute = routes.find((route) => route.name === config.navigation?.sourcePage);
        if (sourceRoute?.target.constructor === Array) {
            routes.forEach((route) => {
                if (route?.target.constructor === Array) {
                    route.target.push((newRoute as Ui5Route).name);
                }
            });
            newRoute.target = sourceRoute.target;
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
 * Writes the template to the memfs editor instance.
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
    const root = join(__dirname, '../../templates/page');

    // enhance manifest.json
    fs.extendJSON(manifestPath, JSON.parse(render(fs.read(join(root, `manifest.json`)), config)), (key, value) => {
        if (key === 'routes') {
            updateRoutes(value as Ui5Route[], config);
        }
        return value;
    });

    // add extension content
    if (config.view?.path) {
        const viewXml = fs.read(config.view.path);
        fs.write(join(config.path, `${config.name}.view.xml`), viewXml);
        // TODO: read controller path from view
        const controllerPath = config.view.path.replace('view.xml', 'controller.js');
        const controllerJs = fs.read(controllerPath);
        // TODO: when the controller is copied, it's id in the sources needs to be changed
        fs.write(join(config.path, `${config.name}.controller.js`), controllerJs);
    } else {
        fs.copyTpl(join(root, 'ext/NAME/View.xml'), join(config.path, `${config.name}.view.xml`), config);
        fs.copyTpl(join(root, 'ext/NAME/Controller.js'), join(config.path, `${config.name}.controller.js`), config);
    }

    return fs;
}
