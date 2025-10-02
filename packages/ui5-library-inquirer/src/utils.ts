import { getUI5Versions, type UI5VersionFilterOptions } from '@sap-ux/ui5-info';
import { ToolsLogger } from '@sap-ux/logger';

/**
 * Gets UI5 versions that are available on npm for use in dropdown prompts.
 * This ensures only versions published to @sapui5/distribution-metadata are shown to users.
 *
 * @param filterOptions - Optional filter options for UI5 versions
 * @returns Promise that resolves to array of UI5 versions available on npm
 */
export async function getNpmAvailableUI5Versions(filterOptions?: UI5VersionFilterOptions) {
    try {
        // Query npm registry for @sapui5/distribution-metadata package to get only npm-published versions
        const npmVersions = await getUI5Versions({
            ...filterOptions,
            onlyVersionNumbers: true,
            onlyNpmVersion: true
        });

        return npmVersions;
    } catch (error) {
        // Log the failure and fall back to standard versions
        new ToolsLogger().warn(
            `Failed to retrieve npm-available UI5 versions. Error: ${
                error instanceof Error ? error.message : String(error)
            }. Falling back to standard UI5 versions.`
        );

        // Fallback to standard UI5 versions if npm query fails
        return await getUI5Versions(filterOptions || {});
    }
}
