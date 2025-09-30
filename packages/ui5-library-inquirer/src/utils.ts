import { getUI5Versions, latestVersionString } from '@sap-ux/ui5-info';
import { ToolsLogger } from '@sap-ux/logger';

/**
 * Resolves a UI5 version to its corresponding npm-published version from @sapui5/distribution-metadata.
 *
 * @param selectedVersion - The UI5 version selected by the user
 * @returns Promise that resolves to the corresponding npm-published UI5 version
 */
export async function resolveUI5VersionToNpm(selectedVersion: string): Promise<string> {
    try {
        // Query npm registry for @sapui5/distribution-metadata package to find the best available version.
        // - onlyNpmVersion: queries npm registry via 'npm show @sapui5/distribution-metadata versions'
        // - onlyVersionNumbers: filters out non-semantic versions like 'snapshot-1.120' or 'Latest'
        // - ui5SelectedVersion: prioritizes the user's selected version if available in npm
        const npmVersion = (
            await getUI5Versions({
                onlyVersionNumbers: true,
                onlyNpmVersion: true,
                ui5SelectedVersion: selectedVersion ?? latestVersionString
            })
        )[0]?.version;

        return npmVersion || selectedVersion;
    } catch (error) {
        // Log the failure and fall back to the selected version
        new ToolsLogger().warn(
            `Failed to resolve npm version for UI5 version '${selectedVersion}'. Error: ${
                error instanceof Error ? error.message : String(error)
            }. Using selected version as fallback.`
        );
        return selectedVersion;
    }
}