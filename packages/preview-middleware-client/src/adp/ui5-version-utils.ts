/**
 * Checks if the given version is lower than the required minimal version.
 * @param version to check
 * @param minVersion to check
 *
 * @returns boolean
 */
export function isLowerThanMinimalUi5Version(version: string, minVersion: string): boolean {
    if (version && minVersion) {
        const minVersionParsed = parseUI5Version(minVersion);
        const ui5VersionParsed = parseUI5Version(version);
        if (!isNaN(ui5VersionParsed.major) && !isNaN(ui5VersionParsed.minor)) {
            if (ui5VersionParsed.major < minVersionParsed.major) {
                return true;
            }
            if (ui5VersionParsed.major === minVersionParsed.major && ui5VersionParsed.minor < minVersionParsed.minor) {
                return true;
            }
        }
    }
    return false;
}

/**
 * Get UI5 version validation message based on conditions.
 * @param ui5Version to validate
 * @returns string with validation message or undefined if non condition is met.
 */
export function getUI5VersionValidationMessage(ui5Version: string): string | undefined {
    if (isLowerThanMinimalUi5Version(ui5Version, '1.71')) {
        return `The current SAPUI5 version set for this Adaptation project is ${ui5Version}. The minimum version to use for SAPUI5 Adaptation Project and its SAPUI5 Visual Editor is 1.71`;
    }

    return undefined;
}

/**
 * Parses the UI5 version
 * Returns NaN for snapshot or snapshot-untested
 * Returns x.xx for snapshot-x.xx
 *
 * @param version the UI5 version to parse
 * @returns The major and the minor version, e.g. 1.86
 */
function parseUI5Version(version: string): { major: number; minor: number } {
    const versionParts = version.replace(/snapshot-untested|snapshot-|snapshot/, '').split('.');
    const major = parseInt(versionParts[0], 10);
    const minor = parseInt(versionParts[1], 10);

    return { major, minor };
}
