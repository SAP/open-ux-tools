import { Editor } from 'mem-fs-editor';
import { join } from 'path';
import { ManifestNamespace } from '@sap-ux/ui5-config';
import { validateBasePath } from '../common/validate';
import type { CustomPage, InternalCustomPage, InternalObjectPage, ObjectPage } from './types';
import type { Manifest } from '../common/types';

/**
 * Add a new route to the provided route array, and update existing routes if necessary (e.g. if targets are defined as arrays for FCL).
 *
 * @param routes existing application routes (from the manifest)
 * @param config configuration object
 */
export function updateRoutes(routes: ManifestNamespace.Route[], config: InternalCustomPage | InternalObjectPage) {
    const newRoute: ManifestNamespace.Route = {
        name: `${config.entity}${config.name}`
    };
    if (config.navigation) {
        const sourceRoute = routes.find((route) => route.name === config.navigation?.sourcePage);
        const pattern = {
            base: sourceRoute?.pattern?.replace(':?query:', ''),
            navEntity: config.navigation.navEntity,
            navKey: config.navigation.navKey ? `({${config.navigation.navEntity}Key})` : ''
        };
        newRoute.pattern = `${pattern.base}/${pattern.navEntity}${pattern.navKey}:?query:`;
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
        newRoute.pattern = routes.length > 0 ? `${config.entity}:?query:` : ':?query:';
        newRoute.target = config.fcl ? [newRoute.name] : newRoute.name;
    }
    routes.push(newRoute);
}

export function getManifestJsonExtensionHelper(
    config: InternalCustomPage | InternalObjectPage
): (key: string, value: any) => any {
    return (key, value) => {
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
    };
}

/**
 * Validate the input parameters for the generation of a custom or an object page.
 *
 * @param basePath - the base path
 * @param config - the custom page configuration
 * @param fs - the memfs editor instance
 * @returns the updated memfs editor instance
 */
export function validatePageConfig(basePath: string, config: CustomPage | ObjectPage, fs: Editor): Editor {
    // common validators

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
