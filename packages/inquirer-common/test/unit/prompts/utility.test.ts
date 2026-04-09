import { jest } from '@jest/globals';
import type { UI5Version } from '@sap-ux/ui5-info';
import type { ListChoiceOptions } from 'inquirer';

const mockGetUi5Themes = jest.fn();

jest.unstable_mockModule('@sap-ux/ui5-info', () => ({
    getUi5Themes: mockGetUi5Themes,
    ui5ThemeIds: {
        SAP_HORIZON: 'sap_horizon',
        SAP_FIORI_3: 'sap_fiori_3',
        SAP_FIORI_3_DARK: 'sap_fiori_3_dark',
        SAP_FIORI_3_HCB: 'sap_fiori_3_hcb',
        SAP_FIORI_3_HCW: 'sap_fiori_3_hcw',
        SAP_HORIZON_DARK: 'sap_horizon_dark',
        SAP_HORIZON_HCB: 'sap_horizon_hcb',
        SAP_HORIZON_HCW: 'sap_horizon_hcw'
    },
    getUI5Versions: jest.fn(),
    getUI5VersionSupportInfo: jest.fn()
}));

const { initI18nInquirerCommon } = await import('../../../src/i18n');
const { getDefaultUI5VersionChoice, getUI5ThemesChoices, searchChoices, ui5VersionsGrouped } = await import(
    '../../../src/prompts/utility'
);
const { ui5ThemeIds } = await import('@sap-ux/ui5-info');

describe('utility.ts', () => {
    beforeAll(async () => {
        await initI18nInquirerCommon();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('ui5VersionsGrouped', async () => {
        const ui5Vers: UI5Version[] = [
            {
                version: '1.118.0',
                maintained: true,
                default: true
            },
            {
                version: '1.117.0',
                maintained: true
            },
            {
                version: '1.116.0',
                maintained: false
            }
        ];

        expect(ui5VersionsGrouped(ui5Vers)).toMatchInlineSnapshot(`
            [
              {
                "name": "1.118.0 - (Maintained version)",
                "value": "1.118.0",
              },
              {
                "name": "1.117.0 - (Maintained version)",
                "value": "1.117.0",
              },
              {
                "name": "1.116.0 - (Out of maintenance version)",
                "value": "1.116.0",
              },
            ]
        `);

        expect(ui5VersionsGrouped(ui5Vers, true)).toMatchSnapshot();

        // No versions provided
        expect(ui5VersionsGrouped([])).toEqual([]);

        const defaultChoice = { name: '9.999.9-snapshot', value: '9.999.9-snapshot' };
        let ui5VersWithAdditonalChoice = ui5VersionsGrouped(ui5Vers, false, defaultChoice);
        expect(ui5VersWithAdditonalChoice[0]).toEqual(defaultChoice);
        expect(ui5VersWithAdditonalChoice).toMatchInlineSnapshot(`
            [
              {
                "name": "9.999.9-snapshot",
                "value": "9.999.9-snapshot",
              },
              {
                "name": "1.118.0 - (Maintained version)",
                "value": "1.118.0",
              },
              {
                "name": "1.117.0 - (Maintained version)",
                "value": "1.117.0",
              },
              {
                "name": "1.116.0 - (Out of maintenance version)",
                "value": "1.116.0",
              },
            ]
        `);

        const defaultChoiceSourceSystem = { name: '1.118.0 (Source system version)', value: '1.118.0' };
        ui5VersWithAdditonalChoice = ui5VersionsGrouped(ui5Vers, false, defaultChoiceSourceSystem, true);
        expect(ui5VersWithAdditonalChoice[0]).toEqual(defaultChoiceSourceSystem);
        expect(ui5VersWithAdditonalChoice).toMatchInlineSnapshot(`
            [
              {
                "name": "1.118.0 (Source system version)",
                "value": "1.118.0",
              },
              {
                "name": "1.117.0 - (Maintained version)",
                "value": "1.117.0",
              },
              {
                "name": "1.116.0 - (Out of maintenance version)",
                "value": "1.116.0",
              },
            ]
        `);
        // check name label when its not a snapshot and its not in the list
        const defaultChoiceSourceSystem2 = { name: '9.999.9 (Source system version)', value: '9.999.9' };
        ui5VersWithAdditonalChoice = ui5VersionsGrouped(ui5Vers, false, defaultChoiceSourceSystem2, true);
        expect(ui5VersWithAdditonalChoice[0]).toEqual(defaultChoiceSourceSystem2);
        expect(ui5VersWithAdditonalChoice).toMatchInlineSnapshot(`
            [
              {
                "name": "9.999.9 (Source system version)",
                "value": "9.999.9",
              },
              {
                "name": "1.118.0 - (Maintained version)",
                "value": "1.118.0",
              },
              {
                "name": "1.117.0 - (Maintained version)",
                "value": "1.117.0",
              },
              {
                "name": "1.116.0 - (Out of maintenance version)",
                "value": "1.116.0",
              },
            ]
        `);

        // If version already exists in the list, it should be remain in place
        const defaultExistingChoice = { name: ui5Vers[1].version, value: ui5Vers[1].version };
        const ui5VersWithExistingChoice = ui5VersionsGrouped(ui5Vers, true, defaultExistingChoice);
        expect(ui5VersWithExistingChoice).toMatchSnapshot();
    });

    it('searchChoices', async () => {
        const searchList: ListChoiceOptions[] = [
            {
                name: 'choice1',
                value: {
                    data: 'abc',
                    id: 'ch1'
                }
            },
            {
                name: 'choice2',
                value: {
                    data: 'bcd',
                    id: 'ch2'
                }
            },
            {
                name: 'choice3',
                value: {
                    data: 'efg',
                    id: 'ch3'
                }
            },
            {
                name: 'choice3.1',
                value: {
                    data: 'hij',
                    id: 'ch3.1'
                }
            }
        ];

        // Single result
        expect(searchChoices('2', searchList)).toMatchInlineSnapshot(`
            [
              {
                "name": "choice2",
                "value": {
                  "data": "bcd",
                  "id": "ch2",
                },
              },
            ]
        `);

        // Multiple results
        expect(searchChoices('ce3', searchList)).toMatchInlineSnapshot(`
            [
              {
                "name": "choice3",
                "value": {
                  "data": "efg",
                  "id": "ch3",
                },
              },
              {
                "name": "choice3.1",
                "value": {
                  "data": "hij",
                  "id": "ch3.1",
                },
              },
            ]
        `);

        // No search text, all results returned
        expect(searchChoices('', searchList)).toMatchInlineSnapshot(`
            [
              {
                "name": "choice1",
                "value": {
                  "data": "abc",
                  "id": "ch1",
                },
              },
              {
                "name": "choice2",
                "value": {
                  "data": "bcd",
                  "id": "ch2",
                },
              },
              {
                "name": "choice3",
                "value": {
                  "data": "efg",
                  "id": "ch3",
                },
              },
              {
                "name": "choice3.1",
                "value": {
                  "data": "hij",
                  "id": "ch3.1",
                },
              },
            ]
        `);
    });

    it('getUI5ThemeChoices', async () => {
        const mockThemes = [
            {
                id: ui5ThemeIds.SAP_HORIZON,
                label: 'Morning Horizon'
            },
            {
                id: ui5ThemeIds.SAP_FIORI_3,
                label: 'Quartz Light'
            }
        ];
        const testUI5Version = '1.1.1';
        mockGetUi5Themes.mockResolvedValue(mockThemes);
        expect(await getUI5ThemesChoices(testUI5Version)).toEqual([
            {
                'name': 'Morning Horizon',
                'value': 'sap_horizon'
            },
            {
                'name': 'Quartz Light',
                'value': 'sap_fiori_3'
            }
        ]);
        expect(mockGetUi5Themes).toHaveBeenCalledWith(testUI5Version);
    });

    it('getDefaultUI5VersionChoice', () => {
        const mockUI5Versions = [
            {
                version: '1.118.0',
                maintained: true,
                default: true
            },
            {
                version: '1.117.1',
                maintained: true
            },
            {
                version: '1.117.0',
                maintained: true
            },
            {
                version: '1.116.0',
                maintained: false
            }
        ];
        let testUI5Version = '1.117.1';

        // Test exact match
        expect(getDefaultUI5VersionChoice(mockUI5Versions, { name: testUI5Version, value: testUI5Version })).toEqual({
            'name': '1.117.1',
            'value': '1.117.1'
        });

        // Version not in the the list
        testUI5Version = '1.119.1';
        expect(getDefaultUI5VersionChoice(mockUI5Versions, { name: testUI5Version, value: testUI5Version })).toEqual({
            'name': '1.119.1',
            'value': '1.119.1'
        });

        // Not valid semver
        testUI5Version = '1.116.1-SNAPSHOT';
        expect(getDefaultUI5VersionChoice(mockUI5Versions, { name: testUI5Version, value: testUI5Version })).toEqual({
            'name': '1.116.0',
            'value': '1.116.0'
        });

        expect(getDefaultUI5VersionChoice(mockUI5Versions)).toEqual({
            'name': '1.118.0',
            'value': '1.118.0'
        });

        const noDefaultUI5Versions = [
            {
                version: '1.118.0',
                maintained: true
            },
            {
                version: '1.117.1',
                maintained: true
            },
            {
                version: '1.117.0',
                maintained: true
            },
            {
                version: '1.116.0',
                maintained: false
            }
        ];

        // No default, returns undefined
        expect(getDefaultUI5VersionChoice(noDefaultUI5Versions)).toBe(undefined);
    });
});
