import type { MinUI5Version } from '../project-context/parser/types';

/**
 * Checks if the provided UI5 version is lower than the minimal required UI5 version.
 *
 * @param providedUi5Version - UI5 version to check.
 * @param minUi5Version - Minimal required UI5 version.
 * @returns true if provided version is lower than minimal required version, false otherwise.
 */
export function isLowerThanMinimalUi5Version(
    providedUi5Version: MinUI5Version,
    minUi5Version: Partial<Pick<MinUI5Version, 'patch'>> & Pick<MinUI5Version, 'major' | 'minor'>
): boolean {
    return (
        providedUi5Version.major < minUi5Version.major ||
        (providedUi5Version.major === minUi5Version.major && providedUi5Version.minor < minUi5Version.minor) ||
        (providedUi5Version.major === minUi5Version.major &&
            providedUi5Version.minor === minUi5Version.minor &&
            (providedUi5Version?.patch ?? 0) < (minUi5Version?.patch ?? 0))
    );
}
