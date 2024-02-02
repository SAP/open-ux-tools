import { defaultVersion } from './constants';
import type { UI5Theme } from './types';
import { coerce, gte, lt } from 'semver';

const MIN_UI5_VER_DARK_THEME = '1.72.0';
const MIN_UI5_VER_HORIZON_THEME = '1.102.0';

export const enum ui5ThemeIds {
    SAP_BELIZE = 'sap_belize',
    SAP_FIORI_3 = 'sap_fiori_3',
    SAP_FIORI_3_DARK = 'sap_fiori_3_dark',
    SAP_HORIZON = 'sap_horizon',
    SAP_HORIZON_DARK = 'sap_horizon_dark'
    // SAP_HORIZON_CONTRAST = 'sap_horizon_hcw',
    // SAP_HORIZON_CONTRAST_DARK = 'sap_horizon_hcb'
}

const ui5Themes: Record<ui5ThemeIds, UI5Theme> = {
    [ui5ThemeIds.SAP_BELIZE]: {
        id: ui5ThemeIds.SAP_BELIZE,
        label: 'Belize'
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
export function getDefaultTheme(ui5Version?: string): string {
    if (ui5Version) {
        if (coerce(ui5Version) && lt(ui5Version, MIN_UI5_VER_HORIZON_THEME)) {
            return ui5ThemeIds.SAP_FIORI_3;
        }
    }
    return ui5ThemeIds.SAP_HORIZON;
}

/**
 * Return supported UI5 themes.
 *
 * @param [ui5Version] - optional, restrict the returned themes to only those supported by specified UI5 version
 * @returns UI5 themes array
 */
export function getUi5Themes(ui5Version: string = defaultVersion): UI5Theme[] {
    let ui5VersionSince = ui5Version.replace('snapshot-', '');
    const cleanSemVer = coerce(ui5VersionSince);
    // If the ui5 version passed cannot be coerced we cannot determine the theme and only defaults will be returned
    ui5VersionSince = cleanSemVer ? cleanSemVer.version : ui5VersionSince;
    return Object.values(ui5Themes).filter((ui5Theme) =>
        ui5Theme.sinceVersion ? cleanSemVer && gte(ui5VersionSince, ui5Theme.sinceVersion) : ui5Theme
    );
}
