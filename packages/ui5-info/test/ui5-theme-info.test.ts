import { getUi5Themes } from '../src';
import { defaultMinUi5Version } from '../src/constants';
import { getDefaultUI5Theme, ui5ThemeIds } from '../src/ui5-theme-info';

describe('getUi5Themes', () => {
    const allExpectedThemes = [
        {
            'id': 'sap_belize',
            'label': 'Belize'
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
