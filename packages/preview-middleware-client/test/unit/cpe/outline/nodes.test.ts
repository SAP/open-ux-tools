import type { OutlineNode } from '@sap-ux-private/control-property-editor-common';

import type { OutlineViewNode } from 'sap/ui/rta/command/OutlineService';
import type { Scenario } from 'sap/ui/fl/Scenario';

import { transformNodes as tn } from '../../../../src/cpe/outline/nodes';
import { sapCoreMock } from 'mock/window';

jest.mock('../../../../src/cpe/outline/utils', () => {
    return {
        isEditable: () => false
    };
});
describe('outline nodes', () => {
    const transformNodes = (nodes: OutlineViewNode[], scenario: Scenario): Promise<OutlineNode[]> =>
        tn(nodes, scenario);
    sapCoreMock.byId.mockReturnValue({
        getMetadata: jest.fn().mockReturnValue({
            getProperty: jest.fn().mockReturnValueOnce('Component').mockReturnValueOnce('Component').mockReturnValue('')
        }),
        getProperty: jest.fn().mockReturnValueOnce('Component').mockReturnValueOnce('Component').mockReturnValue('')
    });
    describe('transformNodes', () => {
        test('empty tree', async () => {
            expect(await transformNodes([], 'UI_ADAPTATION')).toStrictEqual([]);
        });

        test('single element', async () => {
            expect(
                await transformNodes(
                    [
                        {
                            id: 'application-preview-app-component',
                            technicalName: 'v2flex.Component',
                            editable: false,
                            type: 'element',
                            visible: true
                        }
                    ],
                    'UI_ADAPTATION'
                )
            ).toStrictEqual([
                {
                    children: [],
                    controlId: 'application-preview-app-component',
                    controlType: 'v2flex.Component',
                    editable: false,
                    name: 'Component',
                    visible: true
                }
            ]);
        });

        test('extension point', async () => {
            expect(
                await transformNodes(
                    [
                        {
                            id: 'sap.ui.demoapps.rta.fiorielements::SEPMRA_C_PD_Product--listReportFilter',
                            technicalName: 'sap.ui.extensionpoint',
                            name: 'ResponsiveTableColumnsExtension|SEPMRA_C_PD_Product',
                            editable: false,
                            type: 'extensionPoint',
                            visible: true
                        }
                    ],
                    'ADAPTATION_PROJECT'
                )
            ).toStrictEqual([
                {
                    children: [],
                    controlId: 'sap.ui.demoapps.rta.fiorielements::SEPMRA_C_PD_Product--listReportFilter',
                    controlType: 'sap.ui.extensionpoint',
                    editable: false,
                    name: 'ResponsiveTableColumnsExtension|SEPMRA_C_PD_Product',
                    visible: true,
                    icon: undefined
                }
            ]);
        });

        test('aggregation', async () => {
            expect(
                await transformNodes(
                    [
                        {
                            id: 'application-preview-app-component',
                            technicalName: 'v2flex.Component',
                            editable: false,
                            type: 'element',
                            visible: true,
                            elements: [
                                {
                                    id: 'application-preview-app-component',
                                    technicalName: 'rootControl',
                                    editable: false,
                                    type: 'aggregation',
                                    elements: [
                                        {
                                            id: '__layout0',
                                            technicalName: 'sap.f.FlexibleColumnLayout',
                                            editable: false,
                                            type: 'element',
                                            visible: true
                                        }
                                    ]
                                }
                            ]
                        }
                    ],
                    'UI_ADAPTATION'
                )
            ).toStrictEqual([
                {
                    controlId: 'application-preview-app-component',
                    controlType: 'v2flex.Component',
                    editable: false,
                    name: 'Component',
                    visible: true,
                    children: [
                        {
                            controlId: '__layout0',
                            controlType: 'sap.f.FlexibleColumnLayout',
                            name: 'FlexibleColumnLayout',
                            editable: false,
                            visible: true,
                            children: []
                        }
                    ]
                }
            ]);
        });
    });
});
