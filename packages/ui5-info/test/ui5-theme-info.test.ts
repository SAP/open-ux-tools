import { getUi5Themes } from '../src';
import { defaultMinUi5Version } from '../src/constants';
import { getDefaultUI5Theme, ui5ThemeIds } from '../src/ui5-theme-info';

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

    test('getUi5Themes - Edge Case for Theme ABC', () => {
        // Add a mock theme ABC
        const mockThemeABC = {
            id: 'ABC',
            label: 'Theme ABC',
            sinceVersion: '1.90.0',
            untilVersion: '1.100.0'
        };

        const extendedUi5Themes = {
            ...allExpectedThemes,
            ABC: mockThemeABC
        } as any;

        // Test cases for theme ABC
        expect(getUi5Themes('1.89', extendedUi5Themes)).not.toContainEqual(mockThemeABC); // Before sinceVersion
        expect(getUi5Themes('1.90', extendedUi5Themes)).toContainEqual(mockThemeABC); // At sinceVersion
        expect(getUi5Themes('1.95', extendedUi5Themes)).toContainEqual(mockThemeABC); // Within range
        expect(getUi5Themes('1.100', extendedUi5Themes)).not.toContainEqual(mockThemeABC); // At untilVersion
        expect(getUi5Themes('1.101', extendedUi5Themes)).not.toContainEqual(mockThemeABC); // After untilVersion
    });

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
