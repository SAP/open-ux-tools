import type { ImportProjectInfo } from '../types.js';
import { readManifest } from '../utils/common.js';
import { getExcludedThemes } from '../utils/UI5Theme.js';

/**
 * Gets supported themes for the project, excluding deprecated themes.
 * Adds 'sap_bluecrystal' if not present and prefixes all with 'themelib_'.
 *
 * @param projectInfo - Project information containing root path and theme settings
 * @param ui5Version - UI5 version to determine excluded themes
 * @returns Array of supported theme names with 'themelib_' prefix
 */
export async function getSupportedThemes(
    projectInfo: ImportProjectInfo,
    ui5Version: string | undefined
): Promise<string[]> {
    let supportedThemes: string[] = [];

    // Try to read the manifest and extract supported themes
    try {
        const manifest = await readManifest(projectInfo.rootPath, projectInfo.webappPath, projectInfo.uiAdaptation);

        // Get supported themes, filtering out deprecated ones
        supportedThemes =
            manifest?.['sap.ui']?.supportedThemes?.filter(
                (theme) =>
                    // Excluding deprecated themes
                    !getExcludedThemes(ui5Version ?? '').includes(theme) &&
                    theme !== projectInfo.ui5Theme &&
                    // SAP only themes
                    theme.toLowerCase().startsWith('sap_')
            ) || [];
    } catch {
        // Expected: manifest.json may not have supportedThemes property or file may be malformed.
        // Safe to continue with empty array - default theme will still be set.
    }

    // Ensure 'sap_bluecrystal' is included
    if (!supportedThemes.includes('sap_bluecrystal')) {
        supportedThemes.push('sap_bluecrystal');
    }

    // Add themelib_ prefix to all themes
    supportedThemes = supportedThemes.map((theme: string) => `themelib_${theme.toLowerCase()}`);

    return supportedThemes;
}
