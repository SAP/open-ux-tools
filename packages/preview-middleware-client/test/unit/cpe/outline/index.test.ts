import { createUi5Facade } from '../../../../src/cpe/facade';
import { initOutline } from '../../../../src/cpe/outline/index';
import * as nodes from '../../../../src/cpe/outline/nodes';
jest.useFakeTimers();

describe('index', () => {
    const ui5 = createUi5Facade();
    const mockSendAction = jest.fn();
    const mockAttachEvent = jest.fn();
    const mockGetComponent = jest.fn();
    const transformNodesSpy = jest.spyOn(nodes, 'transformNodes');
    sap.ui.getCore = jest
        .fn()
        .mockReturnValueOnce({
            byId: jest.fn().mockReturnValue({
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
            }),
            getComponent: mockGetComponent
        })
        .mockReturnValueOnce({
            byId: jest.fn().mockReturnValue(undefined)
        });
    const runtimeAuthoring = {
        getService: jest.fn().mockReturnValue({
            attachEvent: mockAttachEvent,
            get: jest.fn().mockResolvedValue('views')
        })
    } as any;
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
        await initOutline(runtimeAuthoring, ui5, mockSendAction);
        expect(mockAttachEvent).toMatchInlineSnapshot(`
            [MockFunction] {
              "calls": Array [
                Array [
                  "update",
                  [Function],
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
        const syncOutline = mockAttachEvent.mock.calls[0][1];
        syncOutline.call();
        await jest.advanceTimersByTimeAsync(4000);
        expect(transformNodesSpy).toHaveBeenCalledTimes(1);
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
        const additionalDataCallback = transformNodesSpy.mock.calls[0][2];
        const result = additionalDataCallback('v2flex::sap.::SEPMRA_C_PD_Product--template::Share');
        expect(result).toEqual({ text: 'Share' });
    });

    test('initOutline - exception', async () => {
        transformNodesSpy.mockRejectedValue('error');
        await initOutline(runtimeAuthoring, ui5, mockSendAction);
        const syncOutline = mockAttachEvent.mock.calls[0][1];
        syncOutline.call();
        await jest.advanceTimersByTimeAsync(4000);
        // transformNodesSpy called but rejected.
        expect(transformNodesSpy).toHaveBeenCalled();
        expect(mockSendAction).not.toHaveBeenCalled();
    });

    test('initOutline - empty additional data', async () => {
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
        await initOutline(runtimeAuthoring, ui5, mockSendAction);
        const syncOutline = mockAttachEvent.mock.calls[0][1];
        syncOutline.call();
        await jest.advanceTimersByTimeAsync(4000);
        const additionalDataCallback = transformNodesSpy.mock.calls[0][2];
        const result = additionalDataCallback('v2flex::sap.::SEPMRA_C_PD_Product--template::Share');
        expect(result).toStrictEqual({});
    });
});
