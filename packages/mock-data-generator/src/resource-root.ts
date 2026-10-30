import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MOCKGEN_ERROR_CODE, MockGenError } from './errors.js';
import { t } from './i18n.js';
import { RESOURCES_PREFIX } from './model/packaged-models.js';

/** The root the value banks, semantic rules and role registry of this process are read from. */
let domainRoot: string | undefined;

/**
 * The installed package directory, derived from this module's location when first needed, never when the
 * module loads. A CommonJS bundle gives the module no URL; an ES module bundle gives it the bundle's URL,
 * so a bundled host passes `resourceRoot` instead of relying on it.
 *
 * @returns the package directory, or undefined when the module has no file URL
 */
export function packageDirectory(): string | undefined {
    const moduleUrl: unknown = import.meta.url;
    return typeof moduleUrl === 'string' ? dirname(dirname(fileURLToPath(moduleUrl))) : undefined;
}

/**
 * The package's own `resources/` directory: the default resource root.
 *
 * @returns the absolute path of the package's `resources/` directory
 * @throws {MockGenError} `CONFIGURATION_INVALID` when the module has no file URL, as in a CommonJS bundle
 */
export function packageResourceRoot(): string {
    const directory = packageDirectory();
    if (directory === undefined) {
        throw new MockGenError(MOCKGEN_ERROR_CODE.CONFIGURATION_INVALID, t('configuration.resourceRootUnknown'));
    }
    return join(directory, 'resources');
}

/**
 * Fix the root the domain resources of this process are read from, unless it is already fixed. A process
 * uses one set of domain resources: they are the package's identity (the manifest declares their digests
 * and the classifier head pins the role registry's fingerprint), and every module reads them as fixed
 * data. A session on another root is only accepted when its resources are byte-identical to the loaded
 * ones, which the caller checks against that root's manifest.
 *
 * @param root absolute resource root
 * @returns the root the domain resources are read from: `root`, or the root fixed before it
 */
export function claimDomainResourceRoot(root: string): string {
    domainRoot ??= resolve(root);
    return domainRoot;
}

/**
 * The file a declared resource path names below the domain resource root. The root is the package's own
 * `resources/` directory unless a session fixed another one first.
 *
 * @param declaredPath a manifest dataset path such as `resources/banks/value-banks.v2.json`
 * @returns the absolute file path
 * @example
 * domainResourceFile('resources/rules/role-registry.v1.json'); // <root>/rules/role-registry.v1.json
 */
export function domainResourceFile(declaredPath: string): string {
    domainRoot ??= packageResourceRoot();
    return join(domainRoot, declaredPath.slice(RESOURCES_PREFIX.length));
}
