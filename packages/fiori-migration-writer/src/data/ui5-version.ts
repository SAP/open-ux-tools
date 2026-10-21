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

    // Ensure minimum UI5 version for local development
    if (ui5VersionMinForProject?.length > 0) {
        try {
            ui5VersionMinForProject = semver.gt(ui5VersionMinForProject, minUI5VersionForLocalDev.toString())
                ? ui5VersionMinForProject
                : minUI5VersionForLocalDev.toString();
        } catch (error: unknown) {
            // If semver comparison fails, continue with current version
        }
    }

    // Fetch available UI5 versions with timeout
    const TIMEOUT_MS = 10000; // 10 second timeout
    const timeoutPromise = new Promise((resolve, reject) => {
        setTimeout(() => reject(new Error('UI5 version fetch timeout')), TIMEOUT_MS);
    });

    try {
        const ui5Versions = await Promise.race([
            getUI5Versions({
                onlyVersionNumbers: true,
                onlyNpmVersion: true,
                ui5SelectedVersion: ui5VersionMinForProject,
                ...(ui5SnapshotUrl && { url: ui5SnapshotUrl })
            }),
            timeoutPromise
        ]);
        return ui5Versions;
    } catch (error: unknown) {
        // If fetching UI5 versions fails or times out, return a fallback
        // Using fallback version to prevent migration hang
        return [
            {
                version: ui5VersionMinForProject || minUI5VersionForLocalDev.toString(),
                support: 'Maintenance'
            }
        ];
    }
}
