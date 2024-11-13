import type { OutlineNode } from '@sap-ux-private/control-property-editor-common';

import type { OutlineViewNode } from 'sap/ui/rta/command/OutlineService';
import type { Scenario } from 'sap/ui/fl/Scenario';

import type { ControlTreeIndex } from 'open/ux/preview/client/cpe/types';
import { transformNodes as tn } from '../../../../src/cpe/outline/nodes';

import { sapCoreMock } from 'mock/window';
import ComponentMock from 'mock/sap/ui/core/Component';
import VersionInfo from 'mock/sap/ui/VersionInfo';
import { mockOverlay } from 'mock/sap/ui/dt/OverlayRegistry';
import * as v4Utils from '../../../../src/utils/fe-v4';

jest.mock('../../../../src/cpe/outline/editable', () => {
    return {
        ...jest.requireActual('../../../../src/cpe/outline/editable'),
        isEditable: () => false
    };
});

jest.mock('../../../../src/cpe/utils', () => {
    return {
        ...jest.requireActual('../../../../src/cpe/utils'),
        isReuseComponent: () => true
    };
});

describe('outline nodes', () => {
    const transformNodes = (
        nodes: OutlineViewNode[],
        scenario: Scenario,
        reuseComponentsIds: Set<string> = new Set<string>(),
        controlIndex: ControlTreeIndex = {}
    ): Promise<OutlineNode[]> => tn(nodes, scenario, reuseComponentsIds, controlIndex, {} as any, new Map());
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

    mockOverlay.getDesignTimeMetadata = jest.fn().mockReturnValue({
        getData: jest
            .fn()
            .mockReturnValueOnce({
                manifestPropertyPath: jest
                    .fn()
                    .mockReturnValue('controlConfiguration/@sap.ui.com.v1.LineItem/tableSettings')
            })
            .mockReturnValue(undefined)
    });
    jest.spyOn(v4Utils, 'getPageName').mockReturnValue('TestListReport');
    beforeAll(() => {
        VersionInfo.load.mockResolvedValue({ name: 'sap.ui.core', version: '1.118.1' });
    });

    describe('transformNodes', () => {
        test('table element with configuration setting', async () => {
            expect(
                await transformNodes(
                    [
                        {
                            id: 'table',
                            technicalName: 'sap.SmartTable',
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
                    controlId: 'table',
                    controlType: 'sap.SmartTable',
                    editable: false,
                    name: 'Component',
                    visible: true
                }
            ]);
        });
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

        test('extension point with default content and no created controls present', async () => {
            const node1 = {
                id: 'sap.ui.demoapps.rta.fiorielements::SEPMRA_C_PD_Product--listReportFilter',
                technicalName: 'sap.ui.extensionpoint',
                name: 'ResponsiveTableColumnsExtension|SEPMRA_C_PD_Product',
                editable: false,
                type: 'extensionPoint',
                visible: true,
                extensionPointInfo: {
                    defaultContent: ['id1']
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
                    'controlId': 'application-app-preview-component---View1--hbox',
                    'controlType': 'sap.m.HBox',
                    'name': 'HBox',
                    'editable': false,
                    'visible': true,
                    'children': [
                        {
                            'controlId': 'sap.ui.demoapps.rta.fiorielements::SEPMRA_C_PD_Product--listReportFilter',
                            'controlType': 'sap.ui.extensionpoint',
                            'name': 'ResponsiveTableColumnsExtension|SEPMRA_C_PD_Product',
                            'editable': false,
                            'visible': true,
                            'hasDefaultContent': true,
                            'children': [
                                {
                                    'controlId': 'id1',
                                    'controlType': 'some-name',
                                    'name': 'id1',
                                    'visible': true,
                                    'editable': false,
                                    'children': [],
                                    'hasDefaultContent': false
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
                    visible: true
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

        test('fill reuse components', async () => {
            ComponentMock.getComponentById = jest.fn().mockReturnValue({
                getManifest: () => {
                    return {
                        ['sap.app']: {
                            type: 'component'
                        }
                    };
                }
            });
            const nodes: OutlineViewNode[] = [
                {
                    id: 'application-preview-app-component',
                    technicalName: 'v2flex.Component',
                    editable: false,
                    type: 'element',
                    visible: true,
                    component: true,
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
            ];
            const reuseComponentsIds = new Set<string>();

            await transformNodes(nodes, 'ADAPTATION_PROJECT', reuseComponentsIds);
            expect(reuseComponentsIds.size).toBe(1);
        });
    });
});
