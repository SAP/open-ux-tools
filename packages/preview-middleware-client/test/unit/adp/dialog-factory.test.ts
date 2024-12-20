import type UI5Element from 'sap/ui/core/Element';
import { RTAOptions } from 'sap/ui/rta/RuntimeAuthoring';
import type RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';

import Fragment, { attachBeforeClose } from 'mock/sap/ui/core/Fragment';
import Controller from 'mock/sap/ui/core/mvc/Controller';
import RuntimeAuthoringMock from 'mock/sap/ui/rta/RuntimeAuthoring';

import { DialogFactory, DialogNames } from 'open/ux/preview/client/adp/dialog-factory';
import AddFragment from '../../../src/adp/controllers/AddFragment.controller';
import ControllerExtension from '../../../src/adp/controllers/ControllerExtension.controller';
import ExtensionPoint from '../../../src/adp/controllers/ExtensionPoint.controller';
import AddTableColumnFragments from 'open/ux/preview/client/adp/controllers/AddTableColumnFragments.controller';

describe('DialogFactory', () => {
    afterEach(() => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
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
            DialogNames.ADD_FRAGMENT
        );
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        expect(Fragment.load.mock.calls[0][0].name).toStrictEqual('open.ux.preview.client.adp.ui.AddFragment');
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        expect(Fragment.load.mock.calls[0][0].id).toStrictEqual(undefined);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
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
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        expect(Fragment.load.mock.calls[0][0].name).toStrictEqual(
            'open.ux.preview.client.adp.ui.AddTableColumnFragments'
        );
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        expect(Fragment.load.mock.calls[0][0].id).toStrictEqual(undefined);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
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
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        expect(Fragment.load.mock.calls[0][0].name).toStrictEqual('open.ux.preview.client.adp.ui.ControllerExtension');
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        expect(Fragment.load.mock.calls[0][0].id).toStrictEqual(undefined);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
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
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        expect(Fragment.load.mock.calls[0][0].name).toStrictEqual('open.ux.preview.client.adp.ui.ExtensionPoint');
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        expect(Fragment.load.mock.calls[0][0].id).toStrictEqual('dialog--ExtensionPoint');
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        expect(Fragment.load.mock.calls[0][0].controller).toBeInstanceOf(ExtensionPoint);

        expect(DialogFactory.canOpenDialog).toBe(false);
    });
});
