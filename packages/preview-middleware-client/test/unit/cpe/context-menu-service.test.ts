import RuntimeAuthoringMock from 'mock/sap/ui/rta/RuntimeAuthoring';
import { fetchMock } from 'mock/window';
import type { RTAOptions } from 'sap/ui/rta/RuntimeAuthoring';
import type RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';
import { ActionHandler } from '../../../src/cpe/types';

// Pre-import modules so we can spread their real exports into mocks
const _core = await import('open/ux/preview/client/utils/core');
const _version = await import('open/ux/preview/client/utils/version');
const _i18n = await import('open/ux/preview/client/i18n');
const _common = await import('@sap-ux-private/control-property-editor-common');
const { executeContextMenuAction, requestControlContextMenu } = _common;

const getControlByIdMock = jest.fn();
jest.unstable_mockModule('open/ux/preview/client/utils/core', () => ({
    ..._core,
    getControlById: getControlByIdMock
}));

const getOverlayMock = jest.fn();
jest.unstable_mockModule('open/ux/preview/client/cpe/utils', () => ({
    getOverlay: getOverlayMock,
    getRuntimeControl: jest.fn(),
    isReuseComponent: jest.fn()
}));

const getUi5VersionMock = jest.fn();
jest.unstable_mockModule('open/ux/preview/client/utils/version', () => ({
    ..._version,
    getUi5Version: getUi5VersionMock
}));

const getApplicationTypeMock = jest.fn();
jest.unstable_mockModule('open/ux/preview/client/utils/application', () => ({
    getApplicationType: getApplicationTypeMock
}));

jest.unstable_mockModule('open/ux/preview/client/i18n', () => ({
    ..._i18n,
    getTextBundle: jest.fn().mockResolvedValue({
        hasText: jest.fn().mockReturnValueOnce(true),
        getText: jest.fn().mockReturnValueOnce('This action is disabled because a dialog is already open')
    })
}));

const reportTelemetryMock = jest.fn();
jest.unstable_mockModule('@sap-ux-private/control-property-editor-common', () => ({
    ..._common,
    reportTelemetry: reportTelemetryMock
}));

const { ContextMenuService } = await import('open/ux/preview/client/cpe/context-menu-service');

describe('context-menu-service', () => {
    let sendActionMock: jest.Mock;
    let subscribeMock: jest.Mock<void, [ActionHandler]>;

    beforeEach(() => {
        sendActionMock = jest.fn();
        subscribeMock = jest.fn<void, [ActionHandler]>();
        fetchMock.mockRestore();
    });
    test('executeContextMenuAction - default plugin', async () => {
        const rtaMock = new RuntimeAuthoringMock({} as RTAOptions);
        getControlByIdMock.mockReturnValue({ getMetadata: jest.fn().mockReturnValue({getName: jest.fn().mockReturnValue('sap.m.Button')})});
        getUi5VersionMock.mockReturnValue({major: 1, minor:127, patch:0});
        getApplicationTypeMock.mockReturnValue('fe-v4');
        const actionServiceExecuteSpy = jest.fn();
        rtaMock.getService.mockResolvedValue({ execute: actionServiceExecuteSpy });
        const contextMenuService = new ContextMenuService(rtaMock as unknown as RuntimeAuthoring);
        await contextMenuService.init(sendActionMock, subscribeMock);

        await subscribeMock.mock.calls[0][0](
            executeContextMenuAction({ actionName: 'TESTACTION01', controlId: 'test-control' })
        );
        expect(reportTelemetryMock).toHaveBeenCalledWith({
                                category: 'OutlineContextMenu',
                                actionName: 'TESTACTION01',
                                controlName: 'sap.m.Button',
                                ui5Version: '1.127.0',
                                appType : 'fe-v4'
                            });
        expect(actionServiceExecuteSpy).toHaveBeenCalledWith('test-control', 'TESTACTION01');
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
        getControlByIdMock.mockReturnValue({ id: 'test-control-01' });
        getOverlayMock.mockReturnValue({ id: 'test-control-01' });
        await contextMenuService.init(sendActionMock, subscribeMock);

        await subscribeMock.mock.calls[0][0](requestControlContextMenu.pending('test-control-01'));

        expect(sendActionMock).toHaveBeenCalledWith({
            payload: {
                contextMenuItems: [
                    {
                        enabled: true,
                        id: 'DEFAULTACTION01',
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
