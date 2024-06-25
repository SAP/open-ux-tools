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
    const isA = jest.fn().mockReturnValue(false);
    sapCoreMock.byId.mockReturnValue({
        getMetadata: jest.fn().mockReturnValue({
            getProperty: jest
                .fn()
                .mockReturnValueOnce('Component')
                .mockReturnValueOnce('Component')
                .mockReturnValue(''),
            getElementName: jest.fn().mockReturnValue('some-name')
        }),
        getProperty: jest.fn().mockReturnValueOnce('Component').mockReturnValueOnce('Component').mockReturnValue(''),
        isA
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
                            visible: true,
                            extensionPointInfo: {
                                createdControls: [],
                                defaultContent: []
                            }
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
                    visible: true
                }
            ]);
        });

        test('extension point with default content', async () => {
            const node1 = {
                id: 'sap.ui.demoapps.rta.fiorielements::SEPMRA_C_PD_Product--listReportFilter',
                technicalName: 'sap.ui.extensionpoint',
                name: 'ResponsiveTableColumnsExtension|SEPMRA_C_PD_Product',
                editable: false,
                type: 'extensionPoint',
                visible: true,
                extensionPointInfo: {
                    defaultContent: ['id1'],
                    createdControls: []
                }
            };

            const node2 = {
                id: 'id1',
                technicalName: 'sap.m.Label',
                name: 'New Label',
                editable: false,
                type: 'element',
                visible: true
            };

            const aggregation = {
                editable: false,
                elements: [node1, node2],
                id: 'application-app-preview-component---View1--hbox',
                technicalName: 'items',
                type: 'aggregation'
            };

            const nodes = [
                {
                    icon: 'sap/m/designtime/HBox.icon.svg',
                    id: 'application-app-preview-component---View1--hbox',
                    name: 'HBox',
                    technicalName: 'sap.m.HBox',
                    type: 'element',
                    visible: true,
                    elements: [aggregation]
                } as unknown as OutlineViewNode
            ];

            console.log(JSON.stringify(await transformNodes(nodes, 'ADAPTATION_PROJECT'), null, 2));

            expect(await transformNodes(nodes, 'ADAPTATION_PROJECT')).toStrictEqual([
                {
                    controlId: 'application-app-preview-component---View1--hbox',
                    controlType: 'sap.m.HBox',
                    name: 'HBox',
                    editable: false,
                    visible: true,
                    children: [
                        {
                            controlId: 'sap.ui.demoapps.rta.fiorielements::SEPMRA_C_PD_Product--listReportFilter',
                            controlType: 'sap.ui.extensionpoint',
                            name: 'ResponsiveTableColumnsExtension|SEPMRA_C_PD_Product',
                            editable: false,
                            visible: true,
                            hasDefaultContent: true,
                            children: [
                                {
                                    controlId: 'id1',
                                    controlType: 'some-name',
                                    name: 'id1',
                                    visible: true,
                                    editable: false,
                                    children: [],
                                    hasDefaultContent: false
                                }
                            ]
                        }
                    ]
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
                            children: [],
                            controlId: 'id1',
                            controlType: 'some-name',
                            editable: false,
                            hasDefaultContent: false,
                            name: 'id1',
                            visible: true
                        }
                    ],
                    controlId: 'sap.ui.demoapps.rta.fiorielements::SEPMRA_C_PD_Product--listReportFilter',
                    controlType: 'sap.ui.extensionpoint',
                    editable: false,
                    hasDefaultContent: false,
                    name: 'ResponsiveTableColumnsExtension|SEPMRA_C_PD_Product',
                    visible: true
                }
            ]);
        });

        test('aggregation', async () => {
            const result = await transformNodes(
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
            );
            expect(result).toStrictEqual([
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
        test('building block - ignore children', async () => {
            const isA = jest.fn().mockReturnValue(true);
            sapCoreMock.byId.mockReturnValue({
                getMetadata: jest.fn().mockReturnValue({
                    getProperty: jest
                        .fn()
                        .mockReturnValueOnce('Component')
                        .mockReturnValueOnce('Component')
                        .mockReturnValue(''),
                    getElementName: jest.fn().mockReturnValue('some-name')
                }),
                getProperty: jest
                    .fn()
                    .mockReturnValueOnce('Component')
                    .mockReturnValueOnce('Component')
                    .mockReturnValue(''),
                isA
            });
            const data: OutlineViewNode[] = [
                {
                    id: 'test.namespace--fe::table::1::LineItem::Table',
                    technicalName: 'sap.fe.macros.table.TableAPI',
                    editable: false,
                    type: 'element',
                    visible: false,
                    elements: [
                        {
                            id: 'test.namespace--fe::table::1::LineItem::Table',
                            technicalName: 'content',
                            editable: false,
                            type: 'aggregation',
                            elements: [
                                {
                                    id: 'test.namespace--fe::table::1::LineItem',
                                    technicalName: 'sap.ui.mdc.Table',
                                    editable: true,
                                    type: 'element',
                                    visible: false,
                                    elements: []
                                }
                            ]
                        },
                        {
                            id: 'test.namespace--fe::table::1::LineItem::Table',
                            technicalName: 'actions',
                            editable: false,
                            type: 'aggregation'
                        }
                    ]
                }
            ];
            const result = await transformNodes(data, 'UI_ADAPTATION');
            expect(result).toStrictEqual([
                {
                    controlId: 'test.namespace--fe::table::1::LineItem::Table',
                    controlType: 'sap.fe.macros.table.TableAPI',
                    name: 'Component',
                    editable: false,
                    visible: false,
                    children: []
                }
            ]);
        });
    });
});
