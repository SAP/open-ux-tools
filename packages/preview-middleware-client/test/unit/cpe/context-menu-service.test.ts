import { ContextMenuService } from '../../../src/cpe/context-menu-service';
import { ActionHandler } from '../../../src/cpe/types';
import { executeContextMenuAction, requestControlActionList } from '@sap-ux-private/control-property-editor-common';
import RuntimeAuthoringMock from 'mock/sap/ui/rta/RuntimeAuthoring';
import { fetchMock } from 'mock/window';
import * as coreUtils from '../../../src/utils/core';
import RuntimeAuthoring, { RTAOptions } from 'sap/ui/rta/RuntimeAuthoring';
import * as cpeUtils from '../../../src/cpe/utils';
jest.mock('../../../src/i18n', () => {
    return {
        ...jest.requireActual('../../../src/i18n'),
        getTextBundle: async () => {
            return {
                hasText: jest.fn().mockReturnValueOnce(true),
                getText: jest.fn().mockReturnValueOnce('This action is disabled because a dialog is already open')
            };
        }
    };
});
describe('context-menu-service', () => {
    let sendActionMock: jest.Mock;
    let subscribeMock: jest.Mock<void, [ActionHandler]>;
    let getControlByIdSpy: jest.SpyInstance;
    let getOverlaySpy: jest.SpyInstance;

    beforeEach(() => {
        sendActionMock = jest.fn();
        subscribeMock = jest.fn<void, [ActionHandler]>();
        fetchMock.mockRestore();
        getControlByIdSpy = jest.spyOn(coreUtils, 'getControlById');
        getOverlaySpy = jest.spyOn(cpeUtils, 'getOverlay');
    });
    test('executeContextMenuAction - default plugin', async () => {
        const rtaMock = new RuntimeAuthoringMock({} as RTAOptions);
        const actionServiceExecuteSpy = jest.fn();
        rtaMock.getService.mockResolvedValue({ execute: actionServiceExecuteSpy });
        const contextMenuService = new ContextMenuService(rtaMock as unknown as RuntimeAuthoring);
        await contextMenuService.init(sendActionMock, subscribeMock);

        await subscribeMock.mock.calls[0][0](
            executeContextMenuAction({ actionName: 'TESTACTION01', controlId: 'test-control', defaultPlugin: true })
        );

        expect(actionServiceExecuteSpy).toBeCalledWith('test-control', 'TESTACTION01');
    });

    test('executeContextMenuAction - developer actions', async () => {
        const rtaMock = new RuntimeAuthoringMock({} as RTAOptions);
        const handler1 = jest.fn();
        const handler2 = jest.fn();
        rtaMock.getDefaultPlugins.mockReturnValue({
            contextMenu: {
                _aMenuItems: [
                    { menuItem: { id: 'DEVACTION01', handler: handler1 } },
                    { menuItem: { id: 'DEVACTION02', handler: handler2 } }
                ]
            }
        });
        const contextMenuService = new ContextMenuService(rtaMock as unknown as RuntimeAuthoring);
        getControlByIdSpy.mockReturnValue({ id: 'test-control-01' });
        getOverlaySpy.mockReturnValue({ id: 'test-control-01' });
        await contextMenuService.init(sendActionMock, subscribeMock);

        await subscribeMock.mock.calls[0][0](
            executeContextMenuAction({ actionName: 'DEVACTION01', controlId: 'test-control-01', defaultPlugin: false })
        );

        expect(handler1).toBeCalledWith([{ id: 'test-control-01' }]);
    });

    test('requestControlActionList', async () => {
        const rtaMock = new RuntimeAuthoringMock({} as RTAOptions);
        const actionServiceGetsSpy = jest.fn();
        rtaMock.getService.mockResolvedValue({ get: actionServiceGetsSpy });
        const handler1 = jest.fn();
        const handler2 = jest.fn();
        actionServiceGetsSpy.mockResolvedValue([
            { enabled: true, id: 'DEFAULTACTION01', text: 'default action 01' },
            { enabled: true, id: 'DEFAULTACTION02', text: 'default action 02' }
        ]);
        rtaMock.getDefaultPlugins.mockReturnValue({
            contextMenu: {
                _aMenuItems: [
                    {
                        menuItem: {
                            id: 'DEVACTION01',
                            handler: handler1,
                            enabled: jest.fn().mockReturnValue(true),
                            text: 'dev action 01'
                        }
                    },
                    {
                        menuItem: {
                            id: 'DEVACTION02',
                            handler: handler2,
                            enabled: jest.fn().mockReturnValue(true),
                            text: jest.fn().mockReturnValue('dev action 02')
                        }
                    }
                ]
            }
        });

        const contextMenuService = new ContextMenuService(rtaMock as unknown as RuntimeAuthoring);
        getControlByIdSpy.mockReturnValue({ id: 'test-control-01' });
        getOverlaySpy.mockReturnValue({ id: 'test-control-01' });
        await contextMenuService.init(sendActionMock, subscribeMock);

        await subscribeMock.mock.calls[0][0](requestControlActionList.pending('test-control-01'));

        expect(sendActionMock).toBeCalledWith({
            payload: {
                contextMenuItems: [
                    {
                        actionName: 'DEVACTION01',
                        defaultPlugin: false,
                        enabled: true,
                        name: 'dev action 01',
                        tooltip: ''
                    },
                    {
                        actionName: 'DEVACTION02',
                        defaultPlugin: false,
                        enabled: true,
                        name: 'dev action 02',
                        tooltip: ''
                    },
                    {
                        'actionName': 'DEFAULTACTION01',
                        defaultPlugin: true,
                        enabled: true,
                        name: 'default action 01',
                        tooltip: ''
                    },
                    {
                        actionName: 'DEFAULTACTION02',
                        defaultPlugin: true,
                        enabled: true,
                        name: 'default action 02',
                        tooltip: ''
                    }
                ],
                controlId: 'test-control-01'
            },
            type: '[ext] request-control-action-list <fulfilled>'
        });
    });
});
