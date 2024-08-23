import merge from 'lodash/mergeWith';
import semVer from 'semver';
import { UI5_DEFAULT } from './defaults';

/**
 * Merges two objects. All properties from base and from extension will be present.
 * Overlapping properties will be used from extension. Arrays will be concatenated and de-duped.
 *
 * @param base - any object definition
 * @param extension - another object definition
 * @returns - a merged package defintion
 */
export function mergeObjects<B, E>(base: B, extension: E): B & E {
    return merge({}, base, extension, (objValue: unknown, srcValue: unknown) => {
        // merge and de-dup arrays
        if (objValue instanceof Array && srcValue instanceof Array) {
            return [...new Set([...objValue, ...srcValue])];
        } else {
            return undefined;
        }
    });
}

/**
 * Get the best types version for the given minUI5Version within a selective range, starting at 1.90.0
 * for https://www.npmjs.com/package/@sapui5/ts-types-esm or https://www.npmjs.com/package/@sapui5/types.
 * For anything before use 1.90.0, and if no minVersion is provided, use the latest LTS version (1.108.x).
 *
 * @param minUI5Version the minimum UI5 version that needs to be supported
 * @returns semantic version representing the types version.
 */
export function getEsmTypesVersion(minUI5Version?: string) {
    const version = semVer.coerce(minUI5Version);
    if (!version) {
        return `~${UI5_DEFAULT.TYPES_VERSION_BEST}`;
    } else if (semVer.lt(version, UI5_DEFAULT.ESM_TYPES_VERSION_SINCE)) {
        return `~${UI5_DEFAULT.ESM_TYPES_VERSION_SINCE}`;
    } else {
        return `~${semVer.major(version)}.${semVer.minor(version)}.0`;
    }
}

/**
 * Get the best types version for the given minUI5Version for https://www.npmjs.com/package/@sapui5/ts-types where specific versions are missing.
 *
 * @param minUI5Version the minimum UI5 version that needs to be supported
 * @returns semantic version representing the types version.
 */
export function getTypesVersion(minUI5Version?: string) {
    const version = semVer.coerce(minUI5Version);
    if (!version) {
        return `~${UI5_DEFAULT.TYPES_VERSION_BEST}`;
    } else if (semVer.lt(version, UI5_DEFAULT.TYPES_VERSION_SINCE)) {
        return `~${UI5_DEFAULT.TYPES_VERSION_SINCE}`;
    } else {
        return `~${semVer.major(version)}.${semVer.minor(version)}.0`;
    }
}

/**
 * Get the correct type package name for the given ui5Version.
 * For anything before 1.113.0, use https://www.npmjs.com/package/@sapui5/ts-types-esm,
 * otherwise use the new package https://www.npmjs.com/package/@sapui5/types.
 *
 * @param ui5Version the UI5 version to get the correct package for
 * @returns string representing the types package name.
 */
export function getTypesPackage(ui5Version?: string) {
    const version = semVer.coerce(ui5Version) ?? semVer.coerce(UI5_DEFAULT.TYPES_VERSION_BEST);
    if (version && semVer.lt(version, UI5_DEFAULT.NEW_TYPES_PACKAGE_SINCE)) {
        return UI5_DEFAULT.TS_TYPES_ESM_PACKAGE_NAME;
    } else {
        return UI5_DEFAULT.TYPES_PACKAGE_NAME;
    }
}

/**
 * Replace environment variable references of pattern `env:VAR_NAME` with the value of the corresponding environment variable.
 *
 * @param obj - any object structure
 */
export function replaceEnvVariables(obj: object): void {
    for (const key in obj) {
        const value = (obj as Record<string, unknown>)[key];
        if (typeof value === 'object') {
            replaceEnvVariables(value as object);
        } else if (typeof value === 'string' && value.startsWith('env:')) {
            const varName = value.split('env:')[1];
            (obj as Record<string, unknown>)[key] = process.env[varName];
        }
    }
}
