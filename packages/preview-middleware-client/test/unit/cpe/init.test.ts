import RuntimeAuthoring, { RTAOptions } from 'sap/ui/rta/RuntimeAuthoring';

import * as common from '@sap-ux-private/control-property-editor-common';
import { MessageBarType, showInfoCenterMessage } from '@sap-ux-private/control-property-editor-common';

import Log from 'mock/sap/base/Log';
import RuntimeAuthoringMock from 'mock/sap/ui/rta/RuntimeAuthoring';
import VersionInfo from 'mock/sap/ui/VersionInfo';
import { fetchMock, sapCoreMock } from 'mock/window';

import { ChangeService } from '../../../src/cpe/changes';
import * as flexChange from '../../../src/cpe/changes/flex-change';
import { CommunicationService } from '../../../src/cpe/communication-service';
import { WorkspaceConnectorService } from '../../../src/cpe/connector-service';
import { ContextMenuService } from '../../../src/cpe/context-menu-service';
import init from '../../../src/cpe/init';
import { OutlineService } from '../../../src/cpe/outline/service';
import { QuickActionService } from '../../../src/cpe/quick-actions/quick-action-service';
import { RtaService } from '../../../src/cpe/rta-service';
import { SelectionService } from '../../../src/cpe/selection';
import * as ui5Utils from '../../../src/cpe/ui5-utils';
import connector from '../../../src/flp/WorkspaceConnector';
import { ODataDownStatus } from '../../../src/cpe/odata-health/odata-health-status';

function getWaitForAppLoadedPromise(): Promise<void> {
    return new Promise((resolve) => {
        CommunicationService.sendAction = jest.fn().mockImplementation((change) => {
            if (common.appLoaded.match(change)) {
                resolve();
            }
        });
    });
}

async function waitForCpeInit(rta: RuntimeAuthoring): Promise<void> {
    const waitForAppLoaded = getWaitForAppLoadedPromise();
    // a.vasilev: Inside the init function we have a bunch of promises not included
    // in the await so the only way to include them in the test await so to be able
    // to verify sendAction gets called before the test ends is to use a deferred promise.
    // The deffered promise is resolved when the app-loaded action is sent. This
    // action is sent when all unawaited promises are resolved.
    await init(rta);
    await waitForAppLoaded;
}

async function waitForInfoCenterNotification(): Promise<void> {
    return new Promise((resolve) => {
        (CommunicationService.sendAction as jest.Mock).mockImplementation((change) => {
            if (common.showInfoCenterMessage.match(change)) {
                resolve();
            }
        });
    });
}

const getHealthStatusMock = jest.fn();

jest.mock('../../../src/cpe/odata-health/odata-health-checker', () => ({
    ODataHealthChecker: jest.fn().mockImplementation(() => ({
        getHealthStatus: getHealthStatusMock
    }))
}));

describe('main', () => {
    const UNHEALTHY_ODATA_SERVICE_STATUS = new ODataDownStatus('/servica-a', 'Service not configured properly');

    VersionInfo.load.mockResolvedValue({ version: '1.120.4' });
    const applyChangeSpy = jest
        .spyOn(flexChange, 'applyChange')
        .mockResolvedValueOnce()
        .mockRejectedValueOnce({
            toString: jest
                .fn()
                .mockReturnValue(
                    'Error: Applying property changes failed: Error: "" is of type string, expected boolean for property "enabled" of Element sap.m.Buttonx#v2flex::sap.suite.ui.generic.template.ListReport.view.ListReport::SEPMRA_C_PD_Product--action::SEPMRA_PROD_MAN.SEPMRA_PROD_MAN_Entities::SEPMRA_C_PD_ProductCopy'
                )
        });
    const initOutlineSpy = jest.spyOn(OutlineService.prototype, 'init');
    const rtaSpy = jest.spyOn(RtaService.prototype, 'init');
    const changesServiceSpy = jest.spyOn(ChangeService.prototype, 'init');
    const connectorServiceSpy = jest.spyOn(WorkspaceConnectorService.prototype, 'init');
    const quickActionServiceSpy = jest.spyOn(QuickActionService.prototype, 'init');
    const selectionServiceSpy = jest.spyOn(SelectionService.prototype, 'init');
    const contextMenuServiceSpy = jest.spyOn(ContextMenuService.prototype, 'init');

    beforeAll(() => {
        const apiJson = {
            json: () => {
                return {};
            }
        };
        fetchMock
            .mockImplementationOnce(() => Promise.resolve(apiJson))
            .mockImplementation(() => Promise.resolve({ json: jest.fn().mockResolvedValue({}) }));
    });

    let rta: RuntimeAuthoring;

    beforeEach(() => {
        rta = new RuntimeAuthoringMock({} as RTAOptions);
        RuntimeAuthoringMock.prototype.getFlexSettings = jest.fn().mockReturnValue({
            layer: 'VENDOR',
            scenario: common.SCENARIO.UiAdaptation
        } as any);
        RuntimeAuthoringMock.prototype.getRootControlInstance = jest.fn().mockReturnValue({
            getManifest: jest.fn().mockReturnValue({ 'sap.app': { id: 'testId' } })
        });
        getHealthStatusMock.mockResolvedValue([]);
    });

    afterEach(() => {
        applyChangeSpy.mockClear();
        initOutlineSpy.mockClear();
        rtaSpy.mockClear();
        changesServiceSpy.mockClear();
        connectorServiceSpy.mockClear();
        quickActionServiceSpy.mockClear();
        selectionServiceSpy.mockClear();
        contextMenuServiceSpy.mockClear();
    });

    sapCoreMock.byId.mockReturnValueOnce({
        name: 'sap.m.Button',
        getMetadata: jest.fn().mockImplementationOnce(() => {
            return {
                getName: jest.fn().mockReturnValueOnce('sap.m.Button')
            };
        })
    });
    const mockIconResult = [
        {
            content: 'testIcon1',
            fontFamily: 'sap-icon-font',
            name: 'testIcon1'
        },
        {
            content: 'testIcon2',
            fontFamily: 'sap-icon-font',
            name: 'testIcon2'
        }
    ];
    jest.spyOn(ui5Utils, 'getIcons').mockImplementation(() => {
        return mockIconResult;
    });

    const spyPostMessage = jest.spyOn(CommunicationService, 'subscribe');

    test('init - 1', async () => {
        initOutlineSpy.mockResolvedValue();
        rtaSpy.mockResolvedValue();
        await waitForCpeInit(rta);
        const callBackFn = spyPostMessage.mock.calls[2][0];
        (callBackFn as any)('test');
        // apply change without error
        const payload = {
            controlId:
                'v2flex::sap.suite.ui.generic.template.ListReport.view.ListReport::SEPMRA_C_PD_Product--action::SEPMRA_PROD_MAN.SEPMRA_PROD_MAN_Entities::SEPMRA_C_PD_ProductCopy',
            propertyName: 'enabled',
            value: false
        };
        await callBackFn({
            type: '[ext] change-property',
            payload
        });

        // check delete notifier
        await connector.storage.removeItem('sap.ui.fl.testFile');

        //assert
        expect(applyChangeSpy).toHaveBeenCalledWith({ rta }, payload);
        expect(initOutlineSpy).toHaveBeenCalledTimes(1);
    });

    test('init - rta exception', async () => {
        const error = new Error('Cannot init outline');
        changesServiceSpy.mockResolvedValue();
        initOutlineSpy.mockRejectedValue(error);
        rtaSpy.mockResolvedValue();

        // act
        await waitForCpeInit(rta);

        // assert
        expect(initOutlineSpy).toHaveBeenCalledTimes(1);
        expect(Log.error).toHaveBeenCalledWith('Service Initialization Failed: ', error);
    });

    test('init and appLoaded called', async () => {
        initOutlineSpy.mockResolvedValue();
        rtaSpy.mockResolvedValue();
        changesServiceSpy.mockResolvedValue();
        connectorServiceSpy.mockResolvedValue();
        selectionServiceSpy.mockResolvedValue('' as never);
        quickActionServiceSpy.mockResolvedValue();
        contextMenuServiceSpy.mockResolvedValue();

        await waitForCpeInit(rta);
        expect(CommunicationService.sendAction).toHaveBeenCalledWith(common.appLoaded());
    });

    test('should display a warning when there is unhealthy OData service', async () => {
        initOutlineSpy.mockResolvedValue();
        rtaSpy.mockResolvedValue();
        changesServiceSpy.mockResolvedValue();
        connectorServiceSpy.mockResolvedValue();
        selectionServiceSpy.mockResolvedValue('' as never);
        quickActionServiceSpy.mockResolvedValue();
        contextMenuServiceSpy.mockResolvedValue();
        getHealthStatusMock.mockResolvedValue([UNHEALTHY_ODATA_SERVICE_STATUS]);

        await waitForCpeInit(rta);
        await waitForInfoCenterNotification();

        const sendActionMock = CommunicationService.sendAction as jest.Mock;
        expect(sendActionMock.mock.calls[2][0]).toEqual(
            showInfoCenterMessage({
                title: 'OData Service Health Check',
                description: 'OData service with endpoint /servica-a is down, reason: Service not configured properly.',
                type: MessageBarType.warning
            })
        );
    });

    test('should display an error when there are connectivity issues with the OData health check', async () => {
        initOutlineSpy.mockResolvedValue();
        rtaSpy.mockResolvedValue();
        changesServiceSpy.mockResolvedValue();
        connectorServiceSpy.mockResolvedValue();
        selectionServiceSpy.mockResolvedValue('' as never);
        quickActionServiceSpy.mockResolvedValue();
        contextMenuServiceSpy.mockResolvedValue();
        getHealthStatusMock.mockRejectedValue(new Error('Service unavailable.'));

        await waitForCpeInit(rta);
        await waitForInfoCenterNotification();

        const sendActionMock = CommunicationService.sendAction as jest.Mock;
        expect(sendActionMock.mock.calls[2][0]).toEqual(
            showInfoCenterMessage({
                title: 'OData Service Health Check',
                description: 'Service unavailable.',
                type: MessageBarType.warning
            })
        );
    });
});
