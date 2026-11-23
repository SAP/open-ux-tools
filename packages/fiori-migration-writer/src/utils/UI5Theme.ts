import { distVar } from './constants.js';
import { gte, coerce } from 'semver';
import { ui5Themes } from '@sap-ux/ui5-info';

// Theme ID constants (previously from ui5ThemeIds which is no longer exported)
const UI5_THEME_IDS = {
    SAP_FIORI_3: 'sap_fiori_3',
    SAP_HORIZON: 'sap_horizon',
    SAP_BELIZE: 'sap_belize'
} as const;

/**
 * A theme is excluded if it appears in the base exclusion list or if it has a `deprecateSince`
 * version defined and the current UI5 version is greater than or equal to it.
 *
 * @param {string} ui5Version - The UI5 version to evaluate against exclusion criteria.
 * @returns {string[]} An array of excluded theme names.
 */
export const getExcludedThemes = (ui5Version: string): string[] => {
    const baseExcludedThemes = [
        'sap_hcb',
        'sap_hcw',
        'sap_ux',
        'sap_platinum',
        'sap_goldreflection',
        'sap_belize_plus',
        'sap_belize_hcb',
        'sap_belize_hcw'
    ];

    // Add themes to the exclusion list based on their deprecation status
    for (const [themeId, theme] of Object.entries(ui5Themes)) {
        if (theme.deprecateSince && ui5Version !== distVar && gte(ui5Version, theme.deprecateSince)) {
            baseExcludedThemes.push(themeId);
        }
    }

    return baseExcludedThemes;
};

/**
 * Checks if a given UI5 version is greater than or equal to the theme's supportSince or supportUntil version.
 *
 * @param ui5Version - The version to check.
 * @param themeVersion - The version to compare against (supportSince/supportUntil).
 * @returns {boolean} True if ui5Version >= themeVersion, false otherwise.
 */
function isVersionGte(ui5Version: string, themeVersion?: string): boolean {
    if (!themeVersion) {
        return false;
    }
    const cleanVersion = coerce(ui5Version);
    return !!(cleanVersion && gte(cleanVersion, themeVersion));
}

/**
 * Determines the UI5 theme based on the given UI5 version.
 *
 * If the version is valid and greater than or equal to the support version of the Horizon theme,
 * Horizon is returned. If the version is empty or includes snapshot, Horizon is returned.
 * Otherwise, the provided `currentTheme` is returned.
 *
 * @param {string} ui5Version - The UI5 version to evaluate.
 * @param {string} [currentTheme] - The fallback theme to use if Horizon isn't supported.
 * @returns {string} The appropriate UI5 theme ID.
 */
export const getUi5ThemeBasedOnUi5Version = (
    ui5Version: string,
    currentTheme: string = UI5_THEME_IDS.SAP_FIORI_3
): string => {
    const isHorizonSupported = isVersionGte(ui5Version, ui5Themes[UI5_THEME_IDS.SAP_HORIZON]?.supportSince);
    const isSnapshotOrEmpty = !ui5Version || ui5Version.includes('snapshot');

    if (isHorizonSupported || isSnapshotOrEmpty) {
        return UI5_THEME_IDS.SAP_HORIZON;
    }

    return currentTheme;
};

/**
 *
 * This function searches for the `data-sap-ui-theme` attribute in the HTML string and replaces its value
 * with the provided `ui5Theme`.
 *
 * @param {string} html - The HTML string to update.
 * @param {string} ui5Version - The UI5 version to check against the theme's supportUntil property.
 * @param {string} ui5Theme - The new UI5 theme to set in the `data-sap-ui-theme` attribute.
 * @returns {string} The updated HTML string with the new theme applied, or the original HTML.
 */
export function updateThemeAttribute(html: string, ui5Version: string, ui5Theme: string): string {
    const uiThemeAttributeMarker = 'data-sap-ui-theme="';
    const start = html.indexOf(uiThemeAttributeMarker);
    if (start === -1) {
        return html;
    } // data-sap-ui-theme attribute not found

    const valueStart = start + uiThemeAttributeMarker.length;
    const valueEnd = html.indexOf('"', valueStart);
    if (valueEnd === -1) {
        return html;
    }

    const currentTheme = html.slice(valueStart, valueEnd);

    // Only replace if current theme is sap_belize and it's supportedSince < ui5Version
    const shouldUpdateBelizeTheme =
        currentTheme === UI5_THEME_IDS.SAP_BELIZE &&
        isVersionGte(ui5Version, ui5Themes[UI5_THEME_IDS.SAP_BELIZE]?.supportUntil);

    const isSnapshotOrEmpty = !ui5Version || ui5Version.includes('snapshot');
    if (shouldUpdateBelizeTheme || isSnapshotOrEmpty) {
        return html.slice(0, valueStart) + ui5Theme + html.slice(valueEnd);
    }

    return html;
}
