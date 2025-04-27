import { getIntegrationCard, traverseI18nProperties } from '../../../../src/base/utils/cards';
import packageJson from '../../../../package.json';
import type { I18nEntry, MultiCardsPayload } from '../../../../src/types';
import { create as createMemFsEditor } from 'mem-fs-editor';
import { create as createMemFs } from 'mem-fs';

describe('Common utilities', () => {
    let memFsEditor: ReturnType<typeof createMemFsEditor>;

    beforeEach(() => {
        jest.resetAllMocks();
        const memFs = createMemFs();
        memFsEditor = createMemFsEditor(memFs);
    });

    test('getIntegrationCard', () => {
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
                },
                entitySet: 'salesOrderManage'
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
        const integrationCard = getIntegrationCard(aMultipleCards as MultiCardsPayload[]);
        expect(integrationCard.manifest).toMatchObject(expectedIntegrationCard);
    });

    test('traverseI18nProperties', async () => {
        const i18nContent = 'appTitle=Sales Order';
        const i18nPath = '/webapp/i18n/i18n.properties';
        memFsEditor.write(i18nPath, i18nContent);
        const entries: I18nEntry[] = [
            {
                'comment': 'XFLD: GroupPropertyLabel for new Entry - Created by Card Generator',
                'key': 'CardGeneratorGroupPropertyLabel_Groups_0_Items_0',
                'value': 'new Entry'
            }
        ];
        const { updatedEntries, output } = await traverseI18nProperties(i18nPath, entries, memFsEditor);
        expect(updatedEntries).toEqual({});
        expect(output).toEqual([i18nContent]);
    });

    test('traverseI18nProperties, When new entry matches i18n file content', async () => {
        const i18nContent = 'appTitle=Sales Order';
        const i18nPath = '/webapp/i18n/i18n.properties';
        memFsEditor.write(i18nPath, i18nContent);
        const entries: I18nEntry[] = [{ 'key': 'appTitle', 'value': 'Sales Order' }];
        const { updatedEntries, output } = await traverseI18nProperties(i18nPath, entries, memFsEditor);
        expect(updatedEntries).toEqual({ '0': true });
        expect(output).toEqual([i18nContent]);
    });
});
