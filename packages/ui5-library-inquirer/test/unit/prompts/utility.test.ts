import type { UI5Version } from '@sap-ux/ui5-info';
import { ui5VersionsGrouped, searchChoices } from '../../../src/prompts/utility';
import type { ListChoiceOptions } from 'inquirer';

describe('utility.ts', () => {
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

        // SIngle result
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
});
