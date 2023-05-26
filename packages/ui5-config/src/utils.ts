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
 * for https://www.npmjs.com/package/@sapui5/ts-types-esm
 * For the latest versions the LTS S/4 on-premise version (1.102.x) is used, for anything before we
 * match the versions as far back as available.
 *
 * @param minUI5Version the minimum UI5 version that needs to be supported
 * @returns semantic version representing the types version.
 */
export function getEsmTypesVersion(minUI5Version?: string) {
    const version = semVer.coerce(minUI5Version);
    if (!version || semVer.gte(version, UI5_DEFAULT.TYPES_VERSION_BEST_MIN)) {
        return `~${UI5_DEFAULT.TYPES_VERSION_BEST}`;
    } else {
        return semVer.gte(version, UI5_DEFAULT.ESM_TYPES_VERSION_SINCE)
            ? `~${semVer.major(version)}.${semVer.minor(version)}.0`
            : `~${UI5_DEFAULT.ESM_TYPES_VERSION_SINCE}`;
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
    } else if (semVer.gte(version, UI5_DEFAULT.TYPES_VERSION_BEST)) {
        return `~${UI5_DEFAULT.TYPES_VERSION_BEST}`;
    } else {
        return semVer.gte(version, UI5_DEFAULT.TYPES_VERSION_SINCE)
            ? `~${semVer.major(version)}.${semVer.minor(version)}.${semVer.patch(version)}`
            : UI5_DEFAULT.TYPES_VERSION_PREVIOUS;
    }
}
