import type { ImportProjectInfo } from '../types.js';
import { getUI5Versions, minUI5VersionForLocalDev } from '@sap-ux/ui5-info';
import { getUI5Version } from '../utils/index.js';
import semver from 'semver';

/**
 * Resolves UI5 versions for migration, handling snapshots and version validation.
 *
 * @param projectInfo - Project information containing UI5 version
 * @param ui5SnapshotUrl - Optional snapshot URL to use for UI5 version resolution
 * @returns Resolved UI5 versions object
 */
export async function resolveUI5VersionsForMigration(
    projectInfo: ImportProjectInfo,
    ui5SnapshotUrl: string
): Promise<any> {
    // Remove snapshot suffixes from UI5 version
    const ui5VersionWithoutSnapshot = projectInfo.ui5Version?.replace(/snapshot-untested|snapshot/gi, '');
    let ui5VersionMinForProject = getUI5Version(ui5VersionWithoutSnapshot);

    // Ensure minimum UI5 version for local development.
    // When the project version is at or below the minimum, return it directly: the minimum
    // version may no longer be listed on npm, so passing it to getUI5Versions would cause
    // the "not found" branch to return the latest available version instead.
    if (ui5VersionMinForProject?.length > 0) {
        try {
            if (!semver.gt(ui5VersionMinForProject, minUI5VersionForLocalDev.toString())) {
                return [{ version: minUI5VersionForLocalDev.toString() }];
            }
        } catch (error: unknown) {
            // If semver comparison fails, continue with current version
        }
    }

    // Fetch available UI5 versions
    const ui5Versions = await getUI5Versions({
        onlyVersionNumbers: true,
        onlyNpmVersion: true,
        ui5SelectedVersion: ui5VersionMinForProject,
        ...(ui5SnapshotUrl && { url: ui5SnapshotUrl })
    });

    return ui5Versions;
}
