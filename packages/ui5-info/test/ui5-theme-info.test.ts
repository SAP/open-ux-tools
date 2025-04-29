import { getUi5Themes } from '../src';
import { defaultMinUi5Version } from '../src/constants';
import { getDefaultUI5Theme, ui5ThemeIds } from '../src/ui5-theme-info';
import * as themeInfo from '../src/ui5-theme-info';

describe('getUi5Themes', () => {
    const allExpectedThemes = [
        {
            'id': 'sap_belize',
            'label': 'Belize (deprecated)',
            'untilVersion': '1.136.0'
        },
        {
            'id': 'sap_fiori_3',
            'label': 'Quartz Light'
        },
        {
            'id': 'sap_fiori_3_dark',
            'label': 'Quartz Dark',
            'sinceVersion': '1.72.0'
        },
        {
            'id': 'sap_horizon',
            'label': 'Morning Horizon',
            'sinceVersion': '1.102.0'
        },
        {
            'id': 'sap_horizon_dark',
            'label': 'Evening Horizon',
            'sinceVersion': '1.102.0'
        }
    ];
    test('getUi5Themes', () => {
        expect(getUi5Themes()).toEqual(allExpectedThemes);
        expect(getUi5Themes('not-a-valid-version')).toEqual(allExpectedThemes);
        expect(getUi5Themes(defaultMinUi5Version)).toEqual(allExpectedThemes.slice(0, 2));
        expect(getUi5Themes('1.71')).toEqual(allExpectedThemes.slice(0, 2));
        expect(getUi5Themes('1.72')).toEqual(allExpectedThemes.slice(0, 3));
        expect(getUi5Themes('1.101')).toEqual(allExpectedThemes.slice(0, 3));
        expect(getUi5Themes('1.102')).toEqual(allExpectedThemes);
        expect(getUi5Themes('1.135.0')).toEqual(allExpectedThemes);
        // Filter out sap_belize from allExpectedThemes
        const allExpectedThemesExcludingBelize = allExpectedThemes.filter((theme) => theme.id !== 'sap_belize');
        // expect sap_belize theme to be excluded when ui5 version is above 1.136.0
        expect(getUi5Themes('1.136.0')).toEqual(allExpectedThemesExcludingBelize);
        expect(getUi5Themes('1.155.0')).toEqual(allExpectedThemesExcludingBelize);
    });

    test.each([
        { version: '1.95.0', expectedIncluded: true }, // Within the valid range
        { version: '1.85.0', expectedIncluded: false }, // Before sinceVersion, should exclude ABC
        { version: '1.100.0', expectedIncluded: false }, // Exactly at the untilVersion, should exclude ABC
        { version: '1.105.0', expectedIncluded: false }, // After untilVersion, should exclude ABC
        { version: '1.90.0', expectedIncluded: true }, // Exactly at the sinceVersion, should include ABC
        { version: '1.89.9', expectedIncluded: false } // Just before sinceVersion, should exclude ABC
    ])(
        'getUi5Themes - should exclude themes outside sinceVersion or untilVersion range $version',
        ({ version, expectedIncluded }) => {
            Object.defineProperty(themeInfo, 'ui5Themes', {
                value: {
                    ['ABC']: {
                        id: 'ABC',
                        label: 'Theme ABC',
                        sinceVersion: '1.90.0',
                        untilVersion: '1.100.0'
                    }
                }
            });
            const themes = themeInfo.getUi5Themes(version);
            const hasABC = themes.some((t) => t.id === ('ABC' as themeInfo.ui5ThemeIds));
            expect(hasABC).toBe(expectedIncluded);
            jest.restoreAllMocks();
        }
    );

    test.each([
        { ui5Version: '1.64', expectedTheme: ui5ThemeIds.SAP_FIORI_3 },
        { ui5Version: '1.72.1', expectedTheme: ui5ThemeIds.SAP_FIORI_3 },
        { ui5Version: undefined, expectedTheme: ui5ThemeIds.SAP_HORIZON },
        { ui5Version: 'not-a-valid-version', expectedTheme: ui5ThemeIds.SAP_HORIZON },
        { ui5Version: '1.101.1', expectedTheme: ui5ThemeIds.SAP_FIORI_3 },
        { ui5Version: '1.102', expectedTheme: ui5ThemeIds.SAP_HORIZON },
        { ui5Version: '1.120.0', expectedTheme: ui5ThemeIds.SAP_HORIZON }
    ])('getDefaultUI5Theme($ui5Version, $expectedTheme)', ({ ui5Version, expectedTheme }) => {
        expect(getDefaultUI5Theme(ui5Version)).toEqual(expectedTheme);
    });
});
