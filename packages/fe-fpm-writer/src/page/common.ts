import type { ManifestNamespace } from '@sap-ux/project-access';
import { render } from 'ejs';
import { create as createStorage } from 'mem-fs';
import type { Editor } from 'mem-fs-editor';
import { create } from 'mem-fs-editor';
import { join } from 'path';
import { FCL_ROUTER } from '../common/defaults';
import { extendJSON } from '../common/file';
import type { Manifest } from '../common/types';
import { validateBasePath } from '../common/validate';
import { getTemplatePath } from '../templates';
import type {
    CustomPage,
    FCL,
    InternalCustomPage,
    InternalListReport,
    InternalObjectPage,
    ListReport,
    Navigation,
    ObjectPage
} from './types';

type EnhancePageConfigFunction = (
    data: ObjectPage | ListReport,
    manifest: Manifest
) => InternalObjectPage | InternalListReport;

/**
 * Suffix for patterns to support arbitrary paramters
 */
export const PATTERN_SUFFIX = ':?query:';

/**
 * Generates the pattern for a new route based on the input.
 *
 * @param routes existing routes
 * @param targetEntity entity of the target
 * @param nav navigation object
 * @returns the generated pattern as string
 */
export function generateRoutePattern(
    routes: ManifestNamespace.Route[],
    targetEntity: string,
    nav?: Navigation
): string {
    const parts: string[] = [];
    if (nav?.sourcePage && nav.navEntity) {
        const sourceRoute = routes.find((route) => route.name === nav.sourcePage);
        if (sourceRoute?.pattern) {
            const basePattern = sourceRoute.pattern.replace(PATTERN_SUFFIX, '');
            if (basePattern) {
                parts.push(basePattern);
                parts.push('/');
                parts.push(nav.navEntity);
            } else {
                parts.push(targetEntity);
            }
        } else {
            throw new Error('Navigation source invalid');
        }
    } else if (routes.length > 0) {
        parts.push(targetEntity);
    }

    if (nav?.navKey) {
        parts.push(`({${nav?.navEntity ?? targetEntity}Key})`);
    }
    parts.push(PATTERN_SUFFIX);
    return parts.join('');
}

/**
 * Generates the target property for a route based on exiting routes, configurations and the target's name.
 *
 * @param routes existing routes
 * @param name name of the target page
 * @param fcl optional flag if FCL is enabled
 * @param nav navigation object
 * @returns the target property of a route
 */
export function generateRouteTarget(
    routes: ManifestNamespace.Route[],
    name: string,
    fcl?: boolean,
    nav?: Navigation
): string | [string] | [ManifestNamespace.RouteTargetObject] {
    if (nav?.sourcePage) {
        const sourceRoute = routes.find((route) => route.name === nav.sourcePage);
        // FCL only supports 3 columns, therefore, show the page in fullscreen if it is the 4th level of navigation
        if (fcl && sourceRoute?.target?.constructor === Array && sourceRoute.target.length < 3) {
            return [...sourceRoute.target, name] as [string];
        }
    }
    return fcl ? [name] : name;
}

/**
 * Create a function that can be used as JsonReplace when calling extendJson.
 *
 * @param config page configuration
 * @returns a JsonReplacer function for the usage in ejs
 */
export function getManifestJsonExtensionHelper(
    config: InternalCustomPage | InternalObjectPage | InternalListReport
): (key: string, value: any) => any {
    return (key, value) => {
        switch (key) {
            case 'routing':
                value.routes = value.routes ?? [];
                break;
            case 'routes':
                const routes = value as ManifestNamespace.Route[];
                routes.push({
                    name: `${config.entity}${config.name}`,
                    pattern: generateRoutePattern(routes, config.entity, config.navigation),
                    target: generateRouteTarget(routes, `${config.entity}${config.name}`, config.fcl, config.navigation)
                });
                break;
            default:
                break;
        }
        return value;
    };
}

/**
 * Get the configuration parameters for the flexible column layout based on the given manifest and navigation config.
 *
 * @param manifest existing manifest
 * @param navigation navigation configuration that is to be added
 * @returns fcl configuration
 */
export function getFclConfig(manifest: Manifest, navigation?: Navigation): FCL {
    const config: FCL = {};
    if (manifest['sap.ui5']?.routing?.config?.routerClass === FCL_ROUTER) {
        config.fcl = true;
        if (navigation) {
            const sourceRoute = ((manifest['sap.ui5']?.routing?.routes as ManifestNamespace.Route[]) || []).find(
                (route) => route.name === navigation?.sourcePage
            );
            config.controlAggregation =
                ((sourceRoute?.target as string[]) ?? []).length > 1 ? 'endColumnPages' : 'midColumnPages';
        } else {
            config.controlAggregation = 'beginColumnPages';
        }
    }
    return config;
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
    if (config.navigation?.sourcePage) {
        const manifest = fs.readJSON(join(basePath, 'webapp/manifest.json')) as Manifest;
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

        const route = routes[config.navigation.sourcePage];
        if (!route || !route.pattern || !route.target) {
            throw new Error(`Invalid routing configuration for navigation source ${config.navigation.sourcePage}!`);
        }
    }

    return fs;
}

/**
 * Add an generic page to an existing UI5 application.
 * Supported pages - ListReport or ObjectPage.
 *
 * @param basePath - the base path
 * @param data - the page configuration
 * @param enhanceDataFn - Callback function for data enhancement
 * @param templatePath - path to 'manifest.json' template
 * @param fs - the memfs editor instance
 * @returns the updated memfs editor instance
 */
export function extendPageJSON(
    basePath: string,
    data: ObjectPage,
    enhanceDataFn: EnhancePageConfigFunction,
    templatePath: string,
    fs?: Editor
): Editor {
    if (!fs) {
        fs = create(createStorage());
    }
    validatePageConfig(basePath, data, fs);

    const manifestPath = join(basePath, 'webapp/manifest.json');
    const manifest = fs.readJSON(manifestPath) as Manifest;

    const config = enhanceDataFn(data, manifest);

    // enhance manifest.json
    extendJSON(fs, {
        filepath: manifestPath,
        content: render(fs.read(getTemplatePath(templatePath)), config, {}),
        replacer: getManifestJsonExtensionHelper(config),
        tabInfo: data.tabInfo
    });

    return fs;
}
