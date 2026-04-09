import RuntimeAuthoringMock from 'mock/sap/ui/rta/RuntimeAuthoring';
import { sapCoreMock } from 'mock/window';
import { CommunicationService } from 'open/ux/preview/client/cpe/communication-service';
import Log from 'sap/base/Log';
import type RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';
import { RTAOptions } from 'sap/ui/rta/RuntimeAuthoring';
import type { ChangeService } from '../../../../src/cpe/changes/service';

const transformNodesMock = jest.fn();
jest.unstable_mockModule('open/ux/preview/client/cpe/outline/nodes', () => ({
    transformNodes: transformNodesMock
}));

const { OutlineService } = await import('open/ux/preview/client/cpe/outline/service');

const mockChangeService = {
    syncOutlineChanges: jest.fn()
} as unknown as ChangeService;

jest.useFakeTimers();

describe('index', () => {
    const mockSendAction = jest.fn();
    const mockAttachEvent = jest.fn();
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
        transformNodesMock.mockReset();
        mockAttachEvent.mockClear();
    });
    test('initOutline', async () => {
        transformNodesMock.mockResolvedValue([
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
        expect(transformNodesMock.mock.calls[0][0]).toBe('mockViewNodes');
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
        transformNodesMock.mockRejectedValue(new Error('error'));
        jest.spyOn(CommunicationService, 'sendAction');
        const service = new OutlineService(rtaMock as unknown as RuntimeAuthoring, mockChangeService);
        await service.init(mockSendAction);
        // transformNodesMock called but rejected.
        expect(transformNodesMock).toHaveBeenCalled();
        expect(mockSendAction).not.toHaveBeenCalled();
    });

    test('initOutline - empty additional data', async () => {
        sapCoreMock.byId.mockReturnValueOnce(undefined);
        transformNodesMock.mockResolvedValue([
            {
                children: [],
                controlId: 'application-preview-app-component',
                controlType: 'v2flex.Component',
                editable: false,
                name: 'Component',
                visible: true
            }
        ]);
        transformNodesMock.mockRejectedValue('error');

        const service = new OutlineService(rtaMock as unknown as RuntimeAuthoring, mockChangeService);
        await service.init(mockSendAction);
        expect(transformNodesMock.mock.calls[0][0]).toBe('mockViewNodes');
    });
});
