import type { I18nEntry } from '../../src/utilities';
import {
    prepareFileName,
    prepareCardForSaving,
    prepareCardTypesForSaving,
    traverseI18nProperties
} from '../../src/utilities';
import { promises } from 'fs';

jest.mock('fs', () => ({
    promises: {
        ...jest.requireActual('fs').promises,
        readFile: jest.fn(),
        readdir: jest.fn(),
        stat: jest.fn()
    }
}));

describe('Common utils', () => {
    const mockFsPromisesReadFile = promises.readFile as jest.Mock;
    beforeEach(() => {
        jest.resetAllMocks();
    });

    test('prepareFileName', () => {
        expect(prepareFileName('path/to/file.json')).toBe('file.json');
        expect(prepareFileName('path/to/file')).toBe('file.json');
    });

    test('prepareCardForSaving, when insight version is not declared', () => {
        const card = {
            'sap.insights': {}
        };
        expect(prepareCardForSaving(card)).toBe(
            JSON.stringify({ 'sap.insights': { 'versions': { 'dtMiddleware': '0.2.1' } } }, null, 2)
        );
    });

    test('prepareCardForSaving, when insight version is declared', () => {
        const card = {
            'sap.insights': {
                'versions': {}
            }
        };
        expect(prepareCardForSaving(card)).toBe(
            JSON.stringify({ 'sap.insights': { 'versions': { 'dtMiddleware': '0.2.1' } } }, null, 2)
        );
    });

    test('prepareCardTypesForSaving', () => {
        const aMultipleCards = [
            {
                type: 'integration',
                manifest: {
                    '_version': '1.15.0',
                    'sap.card': {
                        'type': 'Object',
                        'header': {
                            'type': 'Numeric',
                            'title': 'Card title'
                        }
                    }
                }
            },
            {
                type: 'adaptive',
                manifest: {
                    'type': 'AdaptiveCard',
                    'body': [
                        {
                            'type': 'TextBlock',
                            'wrap': true,
                            'weight': 'Bolder',
                            'text': 'Card Title'
                        }
                    ]
                }
            }
        ];
        expect(prepareCardTypesForSaving(aMultipleCards)).toEqual({
            integration: JSON.stringify(aMultipleCards[0].manifest, null, 2),
            adaptive: JSON.stringify(aMultipleCards[1].manifest, null, 2)
        });
    });

    test('traverseI18nProperties', async () => {
        const i18nContent = 'appTitle=Sales Order';
        mockFsPromisesReadFile.mockResolvedValueOnce(i18nContent);
        const entries: I18nEntry[] = [
            {
                'comment': 'XFLD: GroupPropertyLabel for new Entry - Created by Card Generator',
                'key': 'CardGeneratorGroupPropertyLabel_Groups_0_Items_0',
                'value': 'new Entry'
            }
        ];
        const { updatedEntries, output } = await traverseI18nProperties('path/to/i18n', entries);
        expect(updatedEntries).toEqual({});
        expect(output).toEqual([i18nContent]);
    });

    test('traverseI18nProperties, When new entry matches i18n file content', async () => {
        const i18nContent = 'appTitle=Sales Order';
        mockFsPromisesReadFile.mockResolvedValueOnce(i18nContent);
        const entries: I18nEntry[] = [{ 'key': 'appTitle', 'value': 'Sales Order' }];
        const { updatedEntries, output } = await traverseI18nProperties('path/to/i18n', entries);
        expect(updatedEntries).toEqual({ 0: true });
        expect(output).toEqual([i18nContent]);
    });
});
