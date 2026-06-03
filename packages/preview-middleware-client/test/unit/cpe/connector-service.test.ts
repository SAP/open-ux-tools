import * as common from '@sap-ux-private/control-property-editor-common';
import FakeLrepConnector from 'mock/sap/ui/fl/FakeLrepConnector';
import VersionInfo from 'mock/sap/ui/VersionInfo';
import { fetchMock } from 'mock/window';
import { ActionHandler } from '../../../src/cpe/types';

const getAdditionalChangeInfoMock = jest.fn();
jest.unstable_mockModule('open/ux/preview/client/utils/additional-change-info', () => ({
    getAdditionalChangeInfo: getAdditionalChangeInfoMock,
    setAdditionalChangeInfo: jest.fn(),
    clearAdditionalChangeInfo: jest.fn(),
    setAdditionalChangeInfoForChangeFile: jest.fn()
}));

const { default: connector } = await import('open/ux/preview/client/flp/WorkspaceConnector');
const { WorkspaceConnectorService } = await import('open/ux/preview/client/cpe/connector-service');
const { create } = await import('open/ux/preview/client/flp/enableFakeConnector');

describe('connector-service', () => {
    let sendActionMock: jest.Mock;
    beforeEach(() => {
        sendActionMock = jest.fn();
        fetchMock.mockRestore();
    });
    test('init - ui5 > v1.72', async () => {
        VersionInfo.load.mockResolvedValue({
            name: 'SAPUI5 Distribution',
            libraries: [{ name: 'sap.ui.core', version: '1.120.4' }]
        });
        const wsConnector = new WorkspaceConnectorService();
        await wsConnector.init(sendActionMock, jest.fn());

        expect(connector.storage.fileChangeRequestNotifier).toBeInstanceOf(Function);

        // call notifier
        await connector.storage.removeItem('sap.ui.fl.testFile');
        expect(sendActionMock).toHaveBeenCalledWith(common.storageFileChanged('testFile'));
    });

    test('init - ui5 < v1.72', async () => {
        VersionInfo.load.mockResolvedValue({
            name: 'SAPUI5 Distribution',
            libraries: [{ name: 'sap.ui.core', version: '1.71.67' }]
        });
        const wsConnector = new WorkspaceConnectorService();
        await wsConnector.init(sendActionMock, jest.fn());

        expect(FakeLrepConnector.fileChangeRequestNotifier).toBeInstanceOf(Function);

        // call notifier
        await create([{ changeType: 'propertyType', fileName: 'sap.ui.fl.testFile', support: {} }]);
        expect(sendActionMock).toHaveBeenCalledWith(common.storageFileChanged('testFile'));
    });

    test('init - ui5 < v1.84 from npmjs', async () => {
        VersionInfo.load.mockResolvedValue({
            name: 'My Application',
            libraries: [{ name: 'sap.ui.core', version: '1.76.1' }]
        });
        const wsConnector = new WorkspaceConnectorService();
        await wsConnector.init(sendActionMock, jest.fn());

        // call notifier
        await create([{ changeType: 'propertyType', fileName: 'sap.ui.fl.testFile', support: {} }]);
        expect(sendActionMock).not.toHaveBeenCalled();
    });

    test('appdescr_fe_changePageConfiguration change', async () => {
        VersionInfo.load.mockResolvedValue({
            name: 'SAPUI5 Distribution',
            libraries: [{ name: 'sap.ui.core', version: '1.120.4' }]
        });
        const wsConnector = new WorkspaceConnectorService();
        await wsConnector.init(sendActionMock, jest.fn());

        // call notifier
        await connector.storage.setItem('sap.ui.fl.testFile', {
            changeType: 'appdescr_fe_changePageConfiguration',
            fileName: 'sap.ui.fl.testFile',
            support: {}
        });
        expect(sendActionMock).toHaveBeenCalledTimes(0);
    });

    test('appdescr_fe_changePageConfiguration change when app is reloading ', async () => {
        VersionInfo.load.mockResolvedValue({
            name: 'SAPUI5 Distribution',
            libraries: [{ name: 'sap.ui.core', version: '1.120.4' }]
        });
        const wsConnector = new WorkspaceConnectorService();
        const subscribeSpy = jest.fn<void, [ActionHandler]>();
        await wsConnector.init(sendActionMock, subscribeSpy);

        subscribeSpy.mock.calls[0][0](common.reloadApplication({ save: false }));
        // call notifier
        await connector.storage.setItem('sap.ui.fl.testFile', {
            changeType: 'appdescr_fe_changePageConfiguration',
            fileName: 'sap.ui.fl.testFile',
            support: {}
        });
        expect(sendActionMock).toHaveBeenCalledWith(common.storageFileChanged('testFile'));
    });

    test('addXML', async () => {
        VersionInfo.load.mockResolvedValue({
            name: 'SAPUI5 Distribution',
            libraries: [{ name: 'sap.ui.core', version: '1.120.4' }]
        });
        const wsConnector = new WorkspaceConnectorService();
        const subscribeSpy = jest.fn<void, [ActionHandler]>();
        await wsConnector.init(sendActionMock, subscribeSpy);

        subscribeSpy.mock.calls[0][0](common.reloadApplication({ save: true }));
        // call notifier
        await connector.storage.setItem('sap.ui.fl.testFile', {
            changeType: 'addXML',
            fileName: 'sap.ui.fl.testFile',
            support: {}
        });
        expect(sendActionMock).toHaveBeenCalledTimes(1);
        expect(sendActionMock).toHaveBeenCalledWith(common.storageFileChanged('testFile'));
    });

    test('addXML with template', async () => {
        VersionInfo.load.mockResolvedValue({
            name: 'SAPUI5 Distribution',
            libraries: [{ name: 'sap.ui.core', version: '1.120.4' }]
        });
        const wsConnector = new WorkspaceConnectorService();
        const subscribeSpy = jest.fn<void, [ActionHandler]>();
        await wsConnector.init(sendActionMock, subscribeSpy);
        getAdditionalChangeInfoMock.mockReturnValue({ templateName: 'my-template' });

        subscribeSpy.mock.calls[0][0](common.reloadApplication({ save: true }));
        // call notifier
        await connector.storage.setItem('sap.ui.fl.testFile', {
            changeType: 'addXML',
            fileName: 'sap.ui.fl.testFile',
            support: {},
            content: {
                fragmentPath: 'fragments/fragment.xml'
            }
        });

        expect(sendActionMock).toHaveBeenNthCalledWith(1, common.storageFileChanged('testFile'));
        expect(sendActionMock).toHaveBeenNthCalledWith(2, common.storageFileChanged('fragments/fragment.xml'));
    });
});
