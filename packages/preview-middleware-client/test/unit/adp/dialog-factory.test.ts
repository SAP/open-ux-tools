import type UI5Element from 'sap/ui/core/Element';
import type { RTAOptions } from 'sap/ui/rta/RuntimeAuthoring';
import type RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';

import Fragment, { attachBeforeClose } from 'mock/sap/ui/core/Fragment';
import Controller from 'mock/sap/ui/core/mvc/Controller';
import RuntimeAuthoringMock from 'mock/sap/ui/rta/RuntimeAuthoring';

import { DialogFactory, DialogNames } from 'open/ux/preview/client/adp/dialog-factory';
import AddFragment from '../../../src/adp/controllers/AddFragment.controller';
import ControllerExtension from '../../../src/adp/controllers/ControllerExtension.controller';
import ExtensionPoint from '../../../src/adp/controllers/ExtensionPoint.controller';
import AddTableColumnFragments from 'open/ux/preview/client/adp/controllers/AddTableColumnFragments.controller';
import FileExistsDialog from '../../../src/adp/controllers/FileExistsDialog.controller';

describe('DialogFactory', () => {
    afterEach(() => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const closeDialogFunction = attachBeforeClose.mock.calls[0]?.[0];
        if (typeof closeDialogFunction === 'function') {
            // make sure that dialog factory is in clean state after each test
            closeDialogFunction();
        }
        jest.clearAllMocks();
        jest.restoreAllMocks();
    });

    test('ensure that only one dialog is open at a time', async () => {
        const controller = { overlays: {}, rta: { 'yes': 'no' } };
        Controller.create.mockResolvedValue(controller);
        const rtaMock = new RuntimeAuthoringMock({} as RTAOptions);

        AddFragment.prototype.setup = jest.fn();

        await DialogFactory.createDialog(
            {} as unknown as UI5Element,
            rtaMock as unknown as RuntimeAuthoring,
            DialogNames.ADD_FRAGMENT
        );

        await DialogFactory.createDialog(
            {} as unknown as UI5Element,
            rtaMock as unknown as RuntimeAuthoring,
            DialogNames.ADD_FRAGMENT
        );

        expect(Fragment.load).toHaveBeenCalledTimes(1);
        expect(DialogFactory.canOpenDialog).toBe(false);
    });

    test('create Add Fragment dialog', async () => {
        const controller = { overlays: {}, rta: { 'yes': 'no' } };
        Controller.create.mockResolvedValue(controller);
        const rtaMock = new RuntimeAuthoringMock({} as RTAOptions);

        AddFragment.prototype.setup = jest.fn();

        await DialogFactory.createDialog(
            {} as unknown as UI5Element,
            rtaMock as unknown as RuntimeAuthoring,
            DialogNames.ADD_FRAGMENT,
            undefined,
            {
                aggregation: 'actions',
                defaultAggregationArrayIndex: 1
            }
        );

        expect(Fragment.load.mock.calls[0][0].name).toStrictEqual('open.ux.preview.client.adp.ui.AddFragment');

        expect(Fragment.load.mock.calls[0][0].id).toStrictEqual(undefined);

        expect(Fragment.load.mock.calls[0][0].controller).toBeInstanceOf(AddFragment);

        expect(DialogFactory.canOpenDialog).toBe(false);
    });

    test('create Add Table Column Fragment dialog', async () => {
        const controller = { overlays: {}, rta: { 'yes': 'no' } };
        Controller.create.mockResolvedValue(controller);
        const rtaMock = new RuntimeAuthoringMock({} as RTAOptions);

        AddTableColumnFragments.prototype.setup = jest.fn();

        await DialogFactory.createDialog(
            {} as unknown as UI5Element,
            rtaMock as unknown as RuntimeAuthoring,
            DialogNames.ADD_TABLE_COLUMN_FRAGMENTS
        );

        expect(Fragment.load.mock.calls[0][0].name).toStrictEqual(
            'open.ux.preview.client.adp.ui.AddTableColumnFragments'
        );

        expect(Fragment.load.mock.calls[0][0].id).toStrictEqual(undefined);

        expect(Fragment.load.mock.calls[0][0].controller).toBeInstanceOf(AddTableColumnFragments);

        expect(DialogFactory.canOpenDialog).toBe(false);
    });

    test('create Add Controller dialog', async () => {
        const controller = { overlays: {}, rta: { 'yes': 'no' } };
        Controller.create.mockResolvedValue(controller);
        const rtaMock = new RuntimeAuthoringMock({} as RTAOptions);

        ControllerExtension.prototype.setup = jest.fn();

        await DialogFactory.createDialog(
            {} as unknown as UI5Element,
            rtaMock as unknown as RuntimeAuthoring,
            DialogNames.CONTROLLER_EXTENSION
        );

        expect(Fragment.load.mock.calls[0][0].name).toStrictEqual('open.ux.preview.client.adp.ui.ControllerExtension');

        expect(Fragment.load.mock.calls[0][0].id).toStrictEqual(undefined);

        expect(Fragment.load.mock.calls[0][0].controller).toBeInstanceOf(ControllerExtension);

        expect(DialogFactory.canOpenDialog).toBe(false);
    });

    test('create Add Fragment at Extension Point dialog', async () => {
        const controller = { overlays: {}, rta: { 'yes': 'no' } };
        Controller.create.mockResolvedValue(controller);
        const rtaMock = new RuntimeAuthoringMock({} as RTAOptions);

        ExtensionPoint.prototype.setup = jest.fn();

        await DialogFactory.createDialog(
            {} as unknown as UI5Element,
            rtaMock as unknown as RuntimeAuthoring,
            DialogNames.ADD_FRAGMENT_AT_EXTENSION_POINT
        );

        expect(Fragment.load.mock.calls[0][0].name).toStrictEqual('open.ux.preview.client.adp.ui.ExtensionPoint');

        expect(Fragment.load.mock.calls[0][0].id).toStrictEqual('dialog--ExtensionPoint');

        expect(Fragment.load.mock.calls[0][0].controller).toBeInstanceOf(ExtensionPoint);

        expect(DialogFactory.canOpenDialog).toBe(false);
    });

    test('Show File Exists Dialog', async () => {
        const controller = { overlays: {}, rta: { 'yes': 'no' } };
        Controller.create.mockResolvedValue(controller);
        const rtaMock = new RuntimeAuthoringMock({} as RTAOptions);

        FileExistsDialog.prototype.setup = jest.fn();

        await DialogFactory.createDialog(
            {} as unknown as UI5Element,
            rtaMock as unknown as RuntimeAuthoring,
            DialogNames.FILE_EXISTS
        );

        expect(Fragment.load.mock.calls[0][0].name).toStrictEqual('open.ux.preview.client.adp.ui.FileExistsDialog');

        expect(Fragment.load.mock.calls[0][0].id).toStrictEqual(undefined);

        expect(Fragment.load.mock.calls[0][0].controller).toBeInstanceOf(FileExistsDialog);
    });
});
