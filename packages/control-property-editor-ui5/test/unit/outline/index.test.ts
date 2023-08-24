import { initOutline } from '../../../src/outline/index';
import * as nodes from '../../../src/outline/nodes';

const transformNodesSpy = jest.spyOn(nodes, 'transformNodes').mockResolvedValue([
    {
        children: [],
        controlId: 'application-preview-app-component',
        controlType: 'v2flex.Component',
        editable: false,
        name: 'Component',
        visible: true
    }
]);

describe('index', () => {
    const mockSendAction = jest.fn();
    const mockAttachEvent = jest.fn();
    let runtimeAuthoring: any;
    beforeEach(() => {
        const mockGetComponent = jest.fn();
        sap.ui.getCore = jest.fn().mockReturnValue({
            byId: () => {
                return {
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
                };
            },
            getComponent: mockGetComponent
        });
        runtimeAuthoring = {
            getService: jest.fn().mockReturnValue({
                attachEvent: mockAttachEvent,
                get: jest.fn()
            })
        };
    });
    test('initOutline', async () => {
        await initOutline(runtimeAuthoring, mockSendAction);
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
        await syncOutline.call();
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
        const additionalDataCallback = transformNodesSpy.mock.calls[0][1];
        const result = additionalDataCallback('v2flex::sap.::SEPMRA_C_PD_Product--template::Share');
        expect(result).toEqual({ text: 'Share' });
    });
});
