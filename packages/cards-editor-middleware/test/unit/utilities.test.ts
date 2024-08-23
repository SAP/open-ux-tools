import type { I18nEntry } from '../../src/utilities';
import { prepareFileName, prepareCardTypesForSaving, traverseI18nProperties } from '../../src/utilities';
import { promises } from 'fs';
import packageJson from '../../package.json';

jest.mock('fs', () => ({
    promises: {
        ...jest.requireActual('fs').promises,
        readFile: jest.fn(),
        readdir: jest.fn(),
        stat: jest.fn()
    }
}));

describe('Common utilities', () => {
    const mockFsPromisesReadFile = promises.readFile as jest.Mock;
    beforeEach(() => {
        jest.resetAllMocks();
    });

    test('prepareFileName', () => {
        expect(prepareFileName('path/to/file.json')).toBe('file.json');
        expect(prepareFileName('path/to/file')).toBe('file.json');
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
                    },
                    'sap.insights': {
                        'versions': {
                            'ui5': '1.121.0-202403281300'
                        },
                        'templateName': 'ObjectPage',
                        'parentAppId': 'sales.order.wd20',
                        'cardType': 'DT'
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

        const expectedIntegrationCard = {
            '_version': '1.15.0',
            'sap.card': {
                'type': 'Object',
                'header': {
                    'type': 'Numeric',
                    'title': 'Card title'
                }
            },
            'sap.insights': {
                'versions': {
                    'ui5': '1.121.0-202403281300',
                    'dtMiddleware': packageJson.version
                },
                'templateName': 'ObjectPage',
                'parentAppId': 'sales.order.wd20',
                'cardType': 'DT'
            }
        };
        const preparedCards = prepareCardTypesForSaving(aMultipleCards);
        const integrationCard = JSON.parse(preparedCards.integration);

        expect(integrationCard).toMatchObject(expectedIntegrationCard);
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
