import { defaultUI5Libs } from './defaults';

/**
 * Merges the specified ui5 libs with the defaults.
 *
 * @param ui5Libs - The ui5 libraries to be merged with the defaults
 * @returns UI5 libs with defaults
 */
export const getUI5Libs = (ui5Libs?: string | string[]): string[] => {
    const libs = Array.isArray(ui5Libs) ? ui5Libs : ui5Libs?.split(',') || [];
    return defaultUI5Libs.concat(libs).filter((value, index, self) => {
        return self.indexOf(value) === index;
    });
};

/**
 * UI5 task and middleware configurations required for TypeScript projects
 */
export const ui5TSSupport = {
    task: {
        name: 'ui5-tooling-transpile-task',
        afterTask: 'replaceVersion',
        configuration: {
            debug: true,
            removeConsoleStatements: true,
            transpileAsync: true,
            transpileTypeScript: true
        }
    },
    middleware: {
        name: 'ui5-tooling-transpile-middleware',
        afterMiddleware: 'compression',
        configuration: {
            debug: true,
            transpileAsync: true,
            transpileTypeScript: true
        }
    }
};

/**
 * UI5 tasks and middleware configurations required for including npm modules
 */
export const ui5NPMSupport = {
    task: {
        name: 'ui5-tooling-modules-task',
        afterTask: 'replaceVersion',
        configuration: {}
    },
    middleware: {
        name: 'ui5-tooling-modules-middleware',
        afterMiddleware: 'compression',
        configuration: {}
    }
};
