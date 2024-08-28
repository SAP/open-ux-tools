import { sapCoreMock } from 'mock/window';
import { initOutline } from '../../../../src/cpe/outline/index';
import * as nodes from '../../../../src/cpe/outline/nodes';
import RuntimeAuthoringMock from 'mock/sap/ui/rta/RuntimeAuthoring';
import { RTAOptions } from 'sap/ui/rta/RuntimeAuthoring';
import type RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';
import Log from 'sap/base/Log';

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
        // await initOutline(rtaMock as unknown as RuntimeAuthoring, mockSendAction);
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
        // await initOutline(rtaMock as unknown as RuntimeAuthoring, mockSendAction);
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

        // await initOutline(rtaMock as unknown as RuntimeAuthoring, mockSendAction);
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
        // await initOutline(rtaMock as unknown as RuntimeAuthoring, mockSendAction);
        expect(mockSendAction).toHaveBeenNthCalledWith(2, {
            type: '[ext] show-dialog-message',
            payload: {
                message:
                    'Have in mind that reuse components are detected for some views in this application and controller extensions and adding fragments are not supported for such views. Controller extension and adding fragment functionality on these views will be disabled.',
                shouldHideIframe: false
            }
        });
    });
});
