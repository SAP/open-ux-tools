import { defaultVersion, latestVersionString } from './constants';
import type { UI5Theme } from './types';
import type { SemVer } from 'semver';
import { coerce, gte, lt } from 'semver';
import { getLatestUI5Version } from './ui5-version-info';

const MIN_UI5_VER_DARK_THEME = '1.72.0';
const MIN_UI5_VER_HORIZON_THEME = '1.102.0';
const MAX_UI5_VER_BELIZE_THEME = '1.136.0';
const MIN_UI5_VER_BELIZE_DEPRECATED = '1.120.0';

export const enum ui5ThemeIds {
    SAP_BELIZE = 'sap_belize',
    SAP_FIORI_3 = 'sap_fiori_3',
    SAP_FIORI_3_DARK = 'sap_fiori_3_dark',
    SAP_HORIZON = 'sap_horizon',
    SAP_HORIZON_DARK = 'sap_horizon_dark'
}

export const ui5Themes: Record<ui5ThemeIds, UI5Theme> = {
    [ui5ThemeIds.SAP_BELIZE]: {
        id: ui5ThemeIds.SAP_BELIZE,
        label: 'Belize',
        supportUntil: MAX_UI5_VER_BELIZE_THEME,
        deprecateSince: MIN_UI5_VER_BELIZE_DEPRECATED
    },
    [ui5ThemeIds.SAP_FIORI_3]: {
        id: ui5ThemeIds.SAP_FIORI_3,
        label: 'Quartz Light'
    },
    [ui5ThemeIds.SAP_FIORI_3_DARK]: {
        id: ui5ThemeIds.SAP_FIORI_3_DARK,
        label: 'Quartz Dark',
        supportSince: MIN_UI5_VER_DARK_THEME
    },
    [ui5ThemeIds.SAP_HORIZON]: {
        id: ui5ThemeIds.SAP_HORIZON,
        label: 'Morning Horizon',
        supportSince: MIN_UI5_VER_HORIZON_THEME
    },
    [ui5ThemeIds.SAP_HORIZON_DARK]: {
        id: ui5ThemeIds.SAP_HORIZON_DARK,
        label: 'Evening Horizon',
        supportSince: MIN_UI5_VER_HORIZON_THEME
    }
};

/**
 * Get the default theme for the specified ui5 version string.
 *
 * @param ui5Version - optional, if not specified the latest supported theme will be returned
 * @returns UI5 theme identifier e.g. 'sap_fiori_3'
 */
export function getDefaultUI5Theme(ui5Version?: string): string {
    if (ui5Version) {
        const cleanSemVer = coerce(ui5Version);
        if (cleanSemVer && lt(cleanSemVer, MIN_UI5_VER_HORIZON_THEME)) {
            return ui5ThemeIds.SAP_FIORI_3;
        }
    }
    return ui5ThemeIds.SAP_HORIZON;
}

/**
 * Determines whether a given UI5 theme is supported for a specific UI5 version.
 *
 * A theme is considered supported if:
 * - It does not have a `supportSince` version, or the given version is greater than or equal to `supportSince`.
 * - It does not have a `supportUntil` version, or the given version is less than `supportUntil`.
 *
 * @param theme - The UI5 theme.
 * @param cleanSemVer - The semantic version of the ui5Version.
 * @returns true if the theme is supported in the given version, otherwise false.
 */
function isSupported(theme: UI5Theme, cleanSemVer: SemVer): boolean {
    const isSupportedSince = theme.supportSince ? gte(cleanSemVer, theme.supportSince) : true;
    const isSupportedUntil = theme.supportUntil ? lt(cleanSemVer, theme.supportUntil) : true;
    return isSupportedSince && isSupportedUntil;
}

/**
 * Returns the list of supported UI5 themes for a given UI5 version.
 *
 * - If ui5Version is `Latest`, the latest supported UI5 version is used.
 * - If ui5Version is a snapshot version (e.g., 'snapshot-1.137.0'), the snapshot prefix is removed.
 * - If ui5Version is invalid or cannot be parsed into a semantic version, all themes are returned.
 * - Themes that are deprecated for the given version are marked with "(deprecated)" in their label.
 *
 * @param [ui5Version] - The UI5 version to filter themes by. Defaults to `defaultVersion`.
 * @returns {Promise<UI5Theme[]>}  A promise that returns an array of UI5 themes supported for the specified version.
 */
export async function getUi5Themes(ui5Version: string = defaultVersion): Promise<UI5Theme[]> {
    // Handle 'Latest' versions by using the latest supported UI5 version
    const resolvedUi5Version =
        ui5Version === latestVersionString ? await getLatestUI5Version(true) : ui5Version.replace('snapshot-', '');

    const cleanSemVer = coerce(resolvedUi5Version);

    if (!cleanSemVer) {
        return Object.values(ui5Themes);
    }

    const filteredThemes: Partial<Record<ui5ThemeIds, UI5Theme>> = {};

    for (const [id, theme] of Object.entries(ui5Themes) as [ui5ThemeIds, UI5Theme][]) {
        // If the theme is supported, add it to the filtered themes list
        if (isSupported(theme, cleanSemVer)) {
            const isDeprecated = theme.deprecateSince && gte(cleanSemVer, theme.deprecateSince);
            // If the theme is deprecated, add (deprecated) to the label
            filteredThemes[id] = {
                ...theme,
                label: isDeprecated ? `${theme.label} (deprecated)` : theme.label
            };
        }
    }

    return Object.values(filteredThemes);
}
