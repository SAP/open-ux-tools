import { getDefaultUI5Theme, ui5ThemeIds, getUi5Themes, ui5Themes } from '../src/ui5-theme-info';
import { defaultMinUi5Version, defaultVersion } from '../src/constants';
import * as themeInfo from '../src/ui5-theme-info';
import type { UI5Theme } from '../src/types';

describe('getUi5Themes', () => {
    const allExpectedThemes: UI5Theme[] = Object.values(ui5Themes);
    test('getUi5Themes', () => {
        expect(getUi5Themes('not-a-valid-version')).toEqual(allExpectedThemes);
        expect(getUi5Themes(defaultMinUi5Version)).toEqual(allExpectedThemes.slice(0, 2));
        expect(getUi5Themes('1.71')).toEqual(allExpectedThemes.slice(0, 2));
        expect(getUi5Themes('1.72')).toEqual(allExpectedThemes.slice(0, 3));
        expect(getUi5Themes('1.101')).toEqual(allExpectedThemes.slice(0, 3));
        expect(getUi5Themes('1.102')).toEqual(allExpectedThemes);
    });

    describe('Belize Theme Tests', () => {
        const themesWithDeprecatedBelize = allExpectedThemes.map((theme) => {
            if (theme.id === ui5ThemeIds.SAP_BELIZE) {
                return {
                    ...theme,
                    label: 'Belize (deprecated)'
                };
            }
            return theme;
        });

        const themesWithoutBelize = allExpectedThemes.filter((theme) => theme.id !== ui5ThemeIds.SAP_BELIZE);

        beforeEach(() => {
            // Restore the original ui5Themes before each test
            Object.defineProperty(themeInfo, 'ui5Themes', {
                value: allExpectedThemes
            });
        });

        afterEach(() => {
            jest.restoreAllMocks();
        });

        test('excludes sap_belize theme when using default UI5 version ("Latest")', () => {
            expect(getUi5Themes()).toEqual(themesWithoutBelize);
        });

        test('excludes sap_belize theme when explicitly passing "Latest" as UI5 version', () => {
            expect(getUi5Themes(defaultVersion)).toEqual(themesWithoutBelize);
        });

        test('excludes sap_belize theme for snapshot UI5 versions such as "snapshot-1.137.0"', () => {
            expect(getUi5Themes('snapshot-1.137.0')).toEqual(themesWithoutBelize);
        });

        test('should mark sap_belize as deprecated for versions between 1.120.0 and 1.136.0', () => {
            expect(getUi5Themes('1.120.0')).toEqual(themesWithDeprecatedBelize);
            expect(getUi5Themes('1.135.0')).toEqual(themesWithDeprecatedBelize);
        });

        test('should exclude sap_belize for versions above 1.136.0', () => {
            expect(getUi5Themes('1.136.0')).toEqual(themesWithoutBelize);
            expect(getUi5Themes('1.155.0')).toEqual(themesWithoutBelize);
        });

        test('should include sap_belize for versions below 1.120.0', () => {
            expect(getUi5Themes('1.119.9')).toEqual(allExpectedThemes);
            expect(getUi5Themes('1.105.0')).toEqual(allExpectedThemes);
        });
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
                        supportSince: '1.90.0',
                        supportUntil: '1.100.0'
                    }
                }
            });
            const themes = getUi5Themes(version);
            const hasABC = themes.some((t) => t.id === ('ABC' as ui5ThemeIds));
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
