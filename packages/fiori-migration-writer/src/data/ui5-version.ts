import type { ImportProjectInfo } from '../types.js';
import { getUI5Versions, minUI5VersionForLocalDev } from '@sap-ux/ui5-info';
import { getUI5Version } from '../utils/index.js';
import { withTimeoutAndFallback } from '../utils/promise-timeout.js';
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
            const compared = semver.gt(ui5VersionMinForProject, minUI5VersionForLocalDev.toString())
                ? ui5VersionMinForProject
                : minUI5VersionForLocalDev.toString();
            ui5VersionMinForProject = compared;
        } catch (error: unknown) {
            // Intentionally ignore semver comparison errors for invalid version formats.
            // If the project version string is not valid semver (e.g., "latest", "snapshot", custom tags),
            // we proceed with the original value rather than failing the migration.
            // The subsequent getUI5Versions() call will either succeed or trigger the timeout fallback.
        }
    }

    // Fetch available UI5 versions with timeout to prevent indefinite hang
    const TIMEOUT_MS = 10000; // 10 second timeout
    const fallbackVersions = [
        {
            version: ui5VersionMinForProject || minUI5VersionForLocalDev.toString(),
            support: 'Maintenance'
        }
    ];

    const startTime = Date.now();
    const result = await withTimeoutAndFallback(
        () =>
            getUI5Versions({
                onlyVersionNumbers: true,
                onlyNpmVersion: true,
                ui5SelectedVersion: ui5VersionMinForProject,
                ...(ui5SnapshotUrl && { snapshotVersionsHost: ui5SnapshotUrl })
            }),
        TIMEOUT_MS,
        fallbackVersions
    );
    const duration = Date.now() - startTime;

    // Log if timeout was triggered or if it took longer than expected
    if (duration >= TIMEOUT_MS - 100) {
        console.log(`[UI5 Version Resolution] Timeout triggered after ${duration}ms, using fallback versions`);
    } else if (duration > 3000) {
        console.log(`[UI5 Version Resolution] Slow response from CDN: ${duration}ms`);
    }

    return result;
}
