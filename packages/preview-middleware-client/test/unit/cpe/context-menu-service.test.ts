import { ContextMenuService } from '../../../src/cpe/context-menu-service';
import { ActionHandler } from '../../../src/cpe/types';
import * as cpeCpmmon from '@sap-ux-private/control-property-editor-common';
import RuntimeAuthoringMock from 'mock/sap/ui/rta/RuntimeAuthoring';
import { fetchMock } from 'mock/window';
import * as coreUtils from '../../../src/utils/core';
import RuntimeAuthoring, { RTAOptions } from 'sap/ui/rta/RuntimeAuthoring';
import * as cpeUtils from '../../../src/cpe/utils';
import * as versionUtils from '../../../src/utils/version';
import * as applicationUtils from '../../../src/utils/application';

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
    let reportTelemetrySpy: jest.SpyInstance;
    let getUi5VersionSpy: jest.SpyInstance;
    let getApplicationTypeSpy: jest.SpyInstance;

    beforeEach(() => {
        sendActionMock = jest.fn();
        subscribeMock = jest.fn<void, [ActionHandler]>();
        fetchMock.mockRestore();
        getControlByIdSpy = jest.spyOn(coreUtils, 'getControlById');
        getOverlaySpy = jest.spyOn(cpeUtils, 'getOverlay');
        reportTelemetrySpy = jest.spyOn(cpeCpmmon, 'reportTelemetry');
        getUi5VersionSpy = jest.spyOn(versionUtils,'getUi5Version');
        getApplicationTypeSpy = jest.spyOn(applicationUtils,'getApplicationType')
    });
    test('executeContextMenuAction - default plugin', async () => {
        const rtaMock = new RuntimeAuthoringMock({} as RTAOptions);
        getControlByIdSpy.mockReturnValue({ getMetadata: jest.fn().mockReturnValue({getName: jest.fn().mockReturnValue('sap.m.Button')})});
        getUi5VersionSpy.mockReturnValue({major: 1, minor:127, patch:0})
        getApplicationTypeSpy.mockReturnValue('fe-v4')
        const actionServiceExecuteSpy = jest.fn();
        rtaMock.getService.mockResolvedValue({ execute: actionServiceExecuteSpy });
        const contextMenuService = new ContextMenuService(rtaMock as unknown as RuntimeAuthoring);
        await contextMenuService.init(sendActionMock, subscribeMock);

        await subscribeMock.mock.calls[0][0](
            cpeCpmmon.executeContextMenuAction({ actionName: 'TESTACTION01', controlId: 'test-control' })
        );
        expect(reportTelemetrySpy).toBeCalledWith({
                                category: 'OutlineContextMenu',
                                actionName: 'TESTACTION01',
                                controlName: 'sap.m.Button',
                                ui5Version: '1.127.0',
                                appType : 'fe-v4'
                            });
        expect(actionServiceExecuteSpy).toBeCalledWith('test-control', 'TESTACTION01');
    });

    test('requestControlContextMenu', async () => {
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

        await subscribeMock.mock.calls[0][0](cpeCpmmon.requestControlContextMenu.pending('test-control-01'));

        expect(sendActionMock).toBeCalledWith({
            payload: {
                contextMenuItems: [
                    {
                        enabled: true,
                        id : 'DEFAULTACTION01',
                        title: 'default action 01',
                        tooltip: undefined
                    },
                    {
                        enabled: true,
                        id: 'DEFAULTACTION02',
                        title: 'default action 02',
                        tooltip: undefined
                    }
                ],
                controlId: 'test-control-01'
            },
            type: '[ext] request-control-context-menu <fulfilled>'
        });
    });
});
