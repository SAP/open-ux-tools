import { sapCoreMock } from 'mock/window';
import { OutlineService } from '../../../../src/cpe/outline/service';
import * as nodes from '../../../../src/cpe/outline/nodes';
import RuntimeAuthoringMock from 'mock/sap/ui/rta/RuntimeAuthoring';
import { RTAOptions } from 'sap/ui/rta/RuntimeAuthoring';
import type RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';
import Log from 'sap/base/Log';
import type { ChangeService } from '../../../../src/cpe/changes/service';
import { MessageBarType } from '@sap-ux-private/control-property-editor-common';

const mockChangeService = {
    syncOutlineChanges: jest.fn()
} as unknown as ChangeService;

jest.useFakeTimers();

describe('index', () => {
 
    const mockSendAction = jest.fn();
    const mockAttachEvent = jest.fn();
    const transformNodesSpy = jest.spyOn(nodes, 'transformNodes');
    Log.error = jest.fn();
    Log.info = jest.fn();
    sapCoreMock.byId.mockReturnValue({
        getMetadata: () => {
            return {
                getProperty: () => {
                    return {
                        name: 'text',
                        bindable: false,
                        type: 'string'
                    };
                }
            };
        },
        getProperty: () => {
            return 'Share';
        }
    });
    const rtaMock = new RuntimeAuthoringMock({} as RTAOptions);
    rtaMock.getService.mockReturnValue({
        attachEvent: mockAttachEvent,
        get: jest.fn().mockResolvedValue('mockViewNodes')
    });
    afterEach(() => {
        mockSendAction.mockClear();
        transformNodesSpy.mockReset();
        mockAttachEvent.mockClear();
    });
    test('initOutline', async () => {
        transformNodesSpy.mockResolvedValue([
            {
                children: [],
                controlId: 'application-preview-app-component',
                controlType: 'v2flex.Component',
                editable: false,
                name: 'Component',
                visible: true
            }
        ]);
        const service = new OutlineService(rtaMock as unknown as RuntimeAuthoring, mockChangeService);
        await service.init(mockSendAction);
        expect(transformNodesSpy.mock.calls[0][0]).toBe('mockViewNodes');
        expect(mockSendAction).toMatchInlineSnapshot(`
            [MockFunction] {
              "calls": Array [
                Array [
                  Object {
                    "payload": Array [
                      Object {
                        "children": Array [],
                        "controlId": "application-preview-app-component",
                        "controlType": "v2flex.Component",
                        "editable": false,
                        "name": "Component",
                        "visible": true,
                      },
                    ],
                    "type": "[ext] outline-changed",
                  },
                ],
              ],
              "results": Array [
                Object {
                  "type": "return",
                  "value": undefined,
                },
              ],
            }
        `);
    });

    test('initOutline - exception', async () => {
        transformNodesSpy.mockRejectedValue('error');
        const service = new OutlineService(rtaMock as unknown as RuntimeAuthoring, mockChangeService);
        await service.init(mockSendAction);
        // transformNodesSpy called but rejected.
        expect(transformNodesSpy).toHaveBeenCalled();
        expect(mockSendAction).not.toHaveBeenCalled();
    });

    test('initOutline - empty additional data', async () => {
        sapCoreMock.byId.mockReturnValueOnce(undefined);
        transformNodesSpy.mockResolvedValue([
            {
                children: [],
                controlId: 'application-preview-app-component',
                controlType: 'v2flex.Component',
                editable: false,
                name: 'Component',
                visible: true
            }
        ]);
        transformNodesSpy.mockRejectedValue('error');

        const service = new OutlineService(rtaMock as unknown as RuntimeAuthoring, mockChangeService);
        await service.init(mockSendAction);
        expect(transformNodesSpy.mock.calls[0][0]).toBe('mockViewNodes');
    });

    test('initOutLine - send action for reuse components for ADAPTATION_PROJECT scenario', async () => {
        (nodes.transformNodes as jest.Mock).mockImplementation(async (nodes, scenario, reuseComponentsIds) => {
            reuseComponentsIds.add('someViewId');
            return nodes;
        });
        rtaMock.getFlexSettings.mockReturnValue({
            scenario: 'ADAPTATION_PROJECT'
        });
        const service = new OutlineService(rtaMock as unknown as RuntimeAuthoring, mockChangeService);
        await service.init(mockSendAction);
        expect(mockSendAction).toHaveBeenNthCalledWith(2, {
            type: '[ext] show-info-center-message',
            payload: {
                type: MessageBarType.warning,
                title: 'Reuse components detected',
                description: 'Reuse components are detected for some views in this application. Controller extensions, adding fragments and manifest changes are not supported for such views and will be disabled.'
            }
        });
    });
});
