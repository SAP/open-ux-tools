import { getIntegrationCard } from '../../../../src/base/utils/cards';
import packageJson from '../../../../package.json';
import type { MultiCardsPayload } from '../../../../src/types';
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
                    'dtpMiddleware': packageJson.version
                },
                'templateName': 'ObjectPage',
                'parentAppId': 'sales.order.wd20',
                'cardType': 'DT'
            }
        };
        const integrationCard = getIntegrationCard(aMultipleCards as MultiCardsPayload[]);
        expect(integrationCard.manifest).toMatchObject(expectedIntegrationCard);
    });
});
