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
 * UI5 tasks configurations required for TypeScript projects
 */
export const ui5TsTasks = [
    {
        name: 'ui5-tooling-modules-task',
        afterTask: 'replaceVersion',
        configuration: {}
    },
    {
        name: 'ui5-tooling-transpile-task',
        afterTask: 'replaceVersion',
        configuration: {
            debug: true,
            removeConsoleStatements: true,
            transpileAsync: true,
            transpileTypeScript: true
        }
    }
];

/**
 * UI5 middleware configurations required for TypeScript projects
 */
export const ui5TsMiddlewares = [
    {
        name: 'ui5-tooling-modules-middleware',
        afterMiddleware: 'compression',
        configuration: {}
    },
    {
        name: 'ui5-tooling-transpile-middleware',
        afterMiddleware: 'compression',
        configuration: {
            debug: true,
            transpileAsync: true,
            transpileTypeScript: true
        }
    }
];
