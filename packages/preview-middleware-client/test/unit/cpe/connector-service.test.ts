import { WorkspaceConnectorService } from '../../../src/cpe/connector-service';
import connector from '../../../src/flp/WorkspaceConnector';
import { sapMock } from 'mock/window';
import * as common from '@sap-ux-private/control-property-editor-common';
import FakeLrepConnector from 'mock/sap/ui/fl/FakeLrepConnector';
import { create } from '../../../src/flp/enableFakeConnector';

describe('connector-service', () => {
    let sendActionMock: jest.Mock;
    beforeEach(() => {
        sendActionMock = jest.fn();
    });
    test('init - ui5 > v1.72', async () => {
        sapMock.ui.version = '1.120.4';
        const wsConnector = new WorkspaceConnectorService();
        await wsConnector.init(sendActionMock);

        expect(connector.storage.fileChangeRequestNotifier).toBeInstanceOf(Function);

        // call notifier
        await connector.storage.removeItem('sap.ui.fl.testFile');
        expect(sendActionMock).toHaveBeenCalledWith(common.storageFileChanged('testFile'));
    });

    test('init - ui5 < v1.72', async () => {
        sapMock.ui.version = '1.71.67';
        const wsConnector = new WorkspaceConnectorService();
        await wsConnector.init(sendActionMock);

        expect(FakeLrepConnector.fileChangeRequestNotifier).toBeInstanceOf(Function);

        // call notifier
        await create([{ changeType: 'propertyType', fileName: 'sap.ui.fl.testFile', support: {} }]);
        expect(sendActionMock).toHaveBeenCalledWith(common.storageFileChanged('testFile'));
    });
});
