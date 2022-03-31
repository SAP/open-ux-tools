import { join } from 'path';
import { create as createStorage } from 'mem-fs';
import type { Editor } from 'mem-fs-editor';
import { create } from 'mem-fs-editor';
import { render } from 'ejs';
import type { ManifestNamespace } from '@sap-ux/ui5-config';
import { enhanceData } from './defaults';
import type { CustomPage, InternalCustomPage } from './types';
import { validateBasePath, validateVersion } from '../common/validate';
import type { Manifest } from '../common/types';

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
function updateRoutes(routes: ManifestNamespace.Route[], config: InternalCustomPage) {
    const newRoute: ManifestNamespace.Route = {
        name: `${config.entity}${config.name}`
    };
    if (config.navigation) {
        const sourceRoute = routes.find((route) => route.name === config.navigation?.sourcePage);
        newRoute.pattern = `${sourceRoute?.pattern?.replace(':?query:', '')}/${config.navigation.navEntity}({${
            config.navigation.navEntity
        }Key}):?query:`;
        if (sourceRoute?.target?.constructor === Array) {
            const pages = sourceRoute.target;
            // FCL only supports 3 columns, therefore, show the page in fullscreen if it is the 4th level of navigation
            newRoute.target =
                pages.length > 2
                    ? [newRoute.name]
                    : ([...pages, newRoute.name] as [string | ManifestNamespace.RouteTargetObject]);
        } else {
            newRoute.target = config.fcl ? [newRoute.name] : newRoute.name;
        }
    } else {
        newRoute.pattern = `${config.entity}({key}):?query:`;
        newRoute.target = config.fcl ? [newRoute.name] : newRoute.name;
    }
    routes.push(newRoute);
}

/**
 * Validate the input parameters for the execution of generateCustomAction.
 *
 * @param {string} basePath - the base path
 * @param {CustomPage} config - the custom page configuration
 * @param {Editor} [fs] - the memfs editor instance
 * @returns {Promise<Editor>} the updated memfs editor instance
 */
export function validateCustomPageConfig(basePath: string, config: CustomPage, fs?: Editor): Editor {
    // common validators
    validateVersion(config.ui5Version);
    if (!fs) {
        fs = create(createStorage());
    }
    validateBasePath(basePath, fs);

    // validate config against the manifest
    const manifest = fs.readJSON(join(basePath, 'webapp/manifest.json')) as Manifest;
    if (config.navigation) {
        if (!manifest['sap.ui5']?.routing?.targets?.[config.navigation.sourcePage]) {
            throw new Error(`Could not find navigation source ${config.navigation.sourcePage}!`);
        }
        const routes: { [k: string]: ManifestNamespace.RouteWithoutName } = {};
        if (manifest['sap.ui5']?.routing?.routes?.constructor === Array) {
            manifest['sap.ui5'].routing.routes.forEach((routeWithName) => {
                routes[routeWithName.name] = routeWithName;
            });
        } else {
            Object.assign(routes, manifest['sap.ui5']?.routing?.routes ?? {});
        }

        const route = routes[config.navigation?.sourcePage];
        if (!route || !route.pattern || !route.target) {
            throw new Error(
                `Missing or invalid routing configuration for navigation source ${config.navigation.sourcePage}!`
            );
        }
    }

    return fs;
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
    fs = validateCustomPageConfig(basePath, data, fs);

    const manifestPath = join(basePath, 'webapp/manifest.json');
    const config = enhanceData(data, manifestPath, fs);

    // merge content into existing files
    const root = getTemplateRoot(data.ui5Version);

    // enhance manifest.json
    fs.extendJSON(manifestPath, JSON.parse(render(fs.read(join(root, `manifest.json`)), config)), (key, value) => {
        switch (key) {
            case 'routing':
                value.routes = value.routes ?? [];
                break;
            case 'routes':
                updateRoutes(value as ManifestNamespace.Route[], config);
                break;
            default:
                break;
        }
        return value;
    });

    // add extension content
    const viewPath = join(config.path, `${config.name}.view.xml`);
    if (!fs.exists(viewPath)) {
        fs.copyTpl(join(root, 'ext/View.xml'), viewPath, config);
    }
    const controllerPath = join(config.path, `${config.name}.controller.js`);
    if (!fs.exists(controllerPath)) {
        fs.copyTpl(join(root, 'ext/Controller.js'), controllerPath, config);
    }

    return fs;
}
