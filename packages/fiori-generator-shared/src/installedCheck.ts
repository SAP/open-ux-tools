import { coerce, lt } from 'semver';

/**
 * Check for an installed extension, optionally specifying a minimum version.
 * Note, this does not check for activation state of specified extension.
 *
 * @param vscode - vscode instance
 * @param extensionId - the id of the extension to find
 * @param minVersion - the minimum version of the specified extension, lower versions will not be returned. Must be a valid SemVer string.
 * @returns
 */
export function isExtensionInstalled(vscode: any, extensionId: string, minVersion?: string) {
    const foundExt = vscode?.extensions?.getExtension(extensionId);
    if (foundExt) {
        const extVersion = coerce(foundExt.packageJSON.version);
        if (extVersion) {
            // Check installed ver is >= minVersion or return true if minVersion is not specified
            return !(minVersion && lt(extVersion, minVersion));
        }
    }
    return false;
}
