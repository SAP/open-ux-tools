import { defaultVersion } from './constants';
import type { UI5Theme } from './types';
import { coerce, gte, lt } from 'semver';

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
        untilVersion: MAX_UI5_VER_BELIZE_THEME
    },
    [ui5ThemeIds.SAP_FIORI_3]: {
        id: ui5ThemeIds.SAP_FIORI_3,
        label: 'Quartz Light'
    },
    [ui5ThemeIds.SAP_FIORI_3_DARK]: {
        id: ui5ThemeIds.SAP_FIORI_3_DARK,
        label: 'Quartz Dark',
        sinceVersion: MIN_UI5_VER_DARK_THEME
    },
    [ui5ThemeIds.SAP_HORIZON]: {
        id: ui5ThemeIds.SAP_HORIZON,
        label: 'Morning Horizon',
        sinceVersion: MIN_UI5_VER_HORIZON_THEME
    },
    [ui5ThemeIds.SAP_HORIZON_DARK]: {
        id: ui5ThemeIds.SAP_HORIZON_DARK,
        label: 'Evening Horizon',
        sinceVersion: MIN_UI5_VER_HORIZON_THEME
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
 * Return supported UI5 themes.
 *
 * @param [ui5Version] - optional, restrict the returned themes to only those supported by specified UI5 version
 * If the passed version is not a valid semantic version all themes will be returned.
 * @returns UI5 themes array
 */
export function getUi5Themes(ui5Version: string = defaultVersion): UI5Theme[] {
    const ui5VersionSince = ui5Version.replace('snapshot-', '');
    const cleanSemVer = coerce(ui5VersionSince);
    if (cleanSemVer) {
        return Object.values(ui5Themes).filter((ui5Theme) => {
            // Check if the theme is deprecated and the UI5 version is within the deprecated range
            if (
                ui5Theme.id === ui5ThemeIds.SAP_BELIZE &&
                gte(cleanSemVer, MIN_UI5_VER_BELIZE_DEPRECATED) &&
                lt(cleanSemVer, MAX_UI5_VER_BELIZE_THEME)
            ) {
                ui5Theme.label = 'Belize (deprecated)';
            }

            // Check if the theme is within the valid version range
            const isValidSinceVersion = ui5Theme.sinceVersion ? gte(cleanSemVer, ui5Theme.sinceVersion) : true;
            const isValidUntilVersion = ui5Theme.untilVersion ? lt(cleanSemVer, ui5Theme.untilVersion) : true;

            // Include themes that are within their version support range
            if (isValidSinceVersion && isValidUntilVersion) {
                return true;
            }

            return false;
        });
    }

    // If the UI5 version is not valid, return all themes
    return Object.values(ui5Themes);
}
