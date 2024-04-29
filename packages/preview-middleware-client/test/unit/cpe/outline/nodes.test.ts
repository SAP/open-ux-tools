import type { OutlineNode } from '@sap-ux-private/control-property-editor-common';

import type { OutlineViewNode } from 'sap/ui/rta/command/OutlineService';
import type { Scenario } from 'sap/ui/fl/Scenario';

import { removeNodeById, transformNodes as tn } from '../../../../src/cpe/outline/nodes';
import { sapCoreMock } from 'mock/window';

jest.mock('../../../../src/cpe/outline/utils', () => {
    return {
        isEditable: () => false
    };
});

describe('outline nodes', () => {
    const testSet = new Set<string>();
    const transformNodes = (nodes: OutlineViewNode[], scenario: Scenario): Promise<OutlineNode[]> =>
        tn(nodes, scenario, testSet);

    sapCoreMock.byId.mockReturnValue({
        getMetadata: jest.fn().mockReturnValue({
            getProperty: jest
                .fn()
                .mockReturnValueOnce('Component')
                .mockReturnValueOnce('Component')
                .mockReturnValue(''),
            getElementName: jest.fn().mockReturnValue('some-name')
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
                    hasDefaultContent: false,
                    name: 'ResponsiveTableColumnsExtension|SEPMRA_C_PD_Product',
                    visible: true,
                    icon: undefined
                }
            ]);
        });

        test('extension point with default content', async () => {
            const node = {
                id: 'sap.ui.demoapps.rta.fiorielements::SEPMRA_C_PD_Product--listReportFilter',
                technicalName: 'sap.ui.extensionpoint',
                name: 'ResponsiveTableColumnsExtension|SEPMRA_C_PD_Product',
                editable: false,
                type: 'extensionPoint',
                extensionPointInfo: {
                    defaultContent: ['id1', 'id2'],
                    createdControls: []
                },
                visible: true
            } as unknown as OutlineViewNode;

            expect(await transformNodes([node], 'ADAPTATION_PROJECT')).toStrictEqual([
                {
                    children: [
                        {
                            'children': [],
                            'controlId': 'id1',
                            'controlType': 'some-name',
                            'editable': false,
                            'hasDefaultContent': false,
                            'name': 'Component',
                            'visible': true
                        },
                        {
                            'children': [],
                            'controlId': 'id2',
                            'controlType': 'some-name',
                            'editable': false,
                            'hasDefaultContent': false,
                            'name': 'id2',
                            'visible': true
                        }
                    ],
                    controlId: 'sap.ui.demoapps.rta.fiorielements::SEPMRA_C_PD_Product--listReportFilter',
                    controlType: 'sap.ui.extensionpoint',
                    editable: false,
                    hasDefaultContent: true,
                    name: 'ResponsiveTableColumnsExtension|SEPMRA_C_PD_Product',
                    visible: true,
                    icon: undefined
                }
            ]);
        });

        test('extension point with created controls', async () => {
            const node = {
                id: 'sap.ui.demoapps.rta.fiorielements::SEPMRA_C_PD_Product--listReportFilter',
                technicalName: 'sap.ui.extensionpoint',
                name: 'ResponsiveTableColumnsExtension|SEPMRA_C_PD_Product',
                editable: false,
                type: 'extensionPoint',
                extensionPointInfo: {
                    defaultContent: [],
                    createdControls: ['id1']
                },
                visible: true
            } as unknown as OutlineViewNode;

            expect(await transformNodes([node], 'ADAPTATION_PROJECT')).toStrictEqual([
                {
                    children: [
                        {
                            'children': [],
                            'controlId': 'id1',
                            'controlType': 'some-name',
                            'editable': false,
                            'hasDefaultContent': false,
                            'name': 'id1',
                            'visible': true
                        }
                    ],
                    controlId: 'sap.ui.demoapps.rta.fiorielements::SEPMRA_C_PD_Product--listReportFilter',
                    controlType: 'sap.ui.extensionpoint',
                    editable: false,
                    hasDefaultContent: false,
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

    describe('removeNodeById', () => {
        test('should remove node with matching controlId', () => {
            const nodes = [
                { controlId: 'id1', controlType: 'Component', children: [] },
                { controlId: 'id2', controlType: 'Component', children: [] }
            ];

            const uniqueIDs = new Set(['id1']);
            removeNodeById(nodes, uniqueIDs);

            expect(nodes).toEqual([{ controlId: 'id2', controlType: 'Component', children: [] }]);
        });

        test('should not remove node when controlId does not match', () => {
            const nodes = [{ controlId: 'id3', controlType: 'Component', children: [] }];
            const uniqueIDs = new Set(['id1']);

            removeNodeById(nodes, uniqueIDs);

            expect(nodes).toEqual(nodes);
        });

        test('should skip nodes of type sap.ui.extensionpoint', () => {
            const nodes = [
                {
                    controlId: 'id3',
                    controlType: 'sap.ui.extensionpoint',
                    children: [{ controlId: 'id1', controlType: 'sap.m.Label', children: [] }]
                }
            ];

            const uniqueIDs = new Set(['id1']);
            removeNodeById(nodes, uniqueIDs);

            expect(nodes).toEqual([
                {
                    controlId: 'id3',
                    controlType: 'sap.ui.extensionpoint',
                    children: [{ controlId: 'id1', controlType: 'sap.m.Label', children: [] }]
                }
            ]);
        });

        test('should handle nested structures properly', () => {
            const nodes = [
                {
                    controlId: 'root',
                    controlType: 'XMLView',
                    children: [
                        { controlId: 'child1', controlType: 'sap.m.Table', children: [] },
                        { controlId: 'child2', controlType: 'OverflowToolbar', children: [] }
                    ]
                }
            ];

            const uniqueIDs = new Set(['child1']);
            removeNodeById(nodes, uniqueIDs);

            expect(nodes).toEqual([
                {
                    controlId: 'root',
                    controlType: 'XMLView',
                    children: [{ controlId: 'child2', controlType: 'OverflowToolbar', children: [] }]
                }
            ]);
        });
    });
});
