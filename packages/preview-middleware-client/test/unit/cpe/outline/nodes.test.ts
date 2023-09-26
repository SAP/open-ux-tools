import type { OutlineViewNode } from 'sap/ui/rta/command/OutlineService';
import { transformNodes as tn } from '../../../../src/cpe/outline/nodes';
import type { OutlineNode } from '@sap-ux-private/control-property-editor-common';
import { sapCoreMock } from 'mock/window';

jest.mock('../../../../src/cpe/outline/utils', () => {
    return {
        isEditable: () => false
    };
});
describe('outline nodes', () => {
    const transformNodes = (nodes: OutlineViewNode[]): Promise<OutlineNode[]> => tn(nodes);
    sapCoreMock.byId.mockReturnValue({
        getMetadata: jest.fn().mockReturnValue({
            getProperty: jest
                .fn()
                .mockReturnValueOnce('Component')
                .mockReturnValueOnce('Component')
                .mockReturnValue('')
        }),
        getProperty: jest
            .fn()
            .mockReturnValueOnce('Component')
            .mockReturnValueOnce('Component')
            .mockReturnValue('')
    });
    describe('transformNodes', () => {
        test('empty tree', async () => {
            expect(await transformNodes([])).toStrictEqual([]);
        });

        test('single element', async () => {
            expect(
                await transformNodes([
                    {
                        id: 'application-preview-app-component',
                        technicalName: 'v2flex.Component',
                        editable: false,
                        type: 'element',
                        visible: true
                    }
                ])
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

        test('aggregation', async () => {
            expect(
                await transformNodes([
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
                ])
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
