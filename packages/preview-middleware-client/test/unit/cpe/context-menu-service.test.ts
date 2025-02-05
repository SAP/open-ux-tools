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
            executeContextMenuAction({ actionName: 'TESTACTION01', controlId: 'test-control' })
        );

        expect(actionServiceExecuteSpy).toBeCalledWith('test-control', 'TESTACTION01');
    });

    test('requestControlActionList', async () => {
        const rtaMock = new RuntimeAuthoringMock({} as RTAOptions);
        const actionServiceGetsSpy = jest.fn();
        rtaMock.getService.mockResolvedValue({ get: actionServiceGetsSpy });

        actionServiceGetsSpy.mockResolvedValue([
            { enabled: true, id: 'DEFAULTACTION01', text: 'default action 01' },
            { enabled: true, id: 'DEFAULTACTION02', text: 'default action 02' }
        ]);

        const contextMenuService = new ContextMenuService(rtaMock as unknown as RuntimeAuthoring);
        getControlByIdSpy.mockReturnValue({ id: 'test-control-01' });
        getOverlaySpy.mockReturnValue({ id: 'test-control-01' });
        await contextMenuService.init(sendActionMock, subscribeMock);

        await subscribeMock.mock.calls[0][0](requestControlActionList.pending('test-control-01'));

        expect(sendActionMock).toBeCalledWith({
            payload: {
                contextMenuItems: [
                    {
                        'actionName': 'DEFAULTACTION01',
                        enabled: true,
                        name: 'default action 01',
                        tooltip: undefined
                    },
                    {
                        actionName: 'DEFAULTACTION02',
                        enabled: true,
                        name: 'default action 02',
                        tooltip: undefined
                    }
                ],
                controlId: 'test-control-01'
            },
            type: '[ext] request-control-action-list <fulfilled>'
        });
    });
});
