import * as ui5Info from '@sap-ux/ui5-info';
import { ui5ThemeIds, type UI5Version } from '@sap-ux/ui5-info';
import type { ListChoiceOptions } from 'inquirer';
import { initI18nInquirerCommon } from '../../../src/i18n';
import {
    getDefaultUI5VersionChoice,
    getUI5ThemesChoices,
    searchChoices,
    ui5VersionsGrouped
} from '../../../src/prompts/utility';

describe('utility.ts', () => {
    beforeAll(async () => {
        await initI18nInquirerCommon();
    });

    afterEach(() => {
        // Reset all spys (not mocks)
        // jest.restoreAllMocks() only works when the mock was created with jest.spyOn().
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

        expect(ui5VersionsGrouped(ui5Vers, true)).toMatchInlineSnapshot(`
            [
              Separator {
                "line": "[2mMaintained versions[22m",
                "type": "separator",
              },
              {
                "name": "1.118.0",
                "value": "1.118.0",
              },
              {
                "name": "1.117.0",
                "value": "1.117.0",
              },
              Separator {
                "line": "[2mOut of maintenance versions[22m",
                "type": "separator",
              },
              {
                "name": "1.116.0",
                "value": "1.116.0",
              },
            ]
        `);

        // No versions provided
        expect(ui5VersionsGrouped([])).toEqual([]);

        const defaultChoice = { name: '9.999.9-snapshot', value: '9.999.9-snapshot' };
        const ui5VersWithAdditonalChoice = ui5VersionsGrouped(ui5Vers, false, defaultChoice);
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

        // If version already exists in the list, it should be remain in place
        const defaultExistingChoice = { name: ui5Vers[1].version, value: ui5Vers[1].version };
        const ui5VersWithExistingChoice = ui5VersionsGrouped(ui5Vers, true, defaultExistingChoice);
        expect(ui5VersWithExistingChoice).toMatchInlineSnapshot(`
            [
              Separator {
                "line": "[2mMaintained versions[22m",
                "type": "separator",
              },
              {
                "name": "1.118.0",
                "value": "1.118.0",
              },
              {
                "name": "1.117.0",
                "value": "1.117.0",
              },
              Separator {
                "line": "[2mOut of maintenance versions[22m",
                "type": "separator",
              },
              {
                "name": "1.116.0",
                "value": "1.116.0",
              },
            ]
        `);
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

    it('getUI5ThemeChoices', () => {
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
        const getUI5ThemesSpy = jest.spyOn(ui5Info, 'getUi5Themes').mockReturnValue(mockThemes);
        expect(getUI5ThemesChoices(testUI5Version)).toEqual([
            {
                'name': 'Morning Horizon',
                'value': 'sap_horizon'
            },
            {
                'name': 'Quartz Light',
                'value': 'sap_fiori_3'
            }
        ]);
        expect(getUI5ThemesSpy).toHaveBeenCalledWith(testUI5Version);
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
