import type Dialog from 'sap/m/Dialog';
import type Event from 'sap/ui/base/Event';
import type UI5Element from 'sap/ui/core/Element';
import type JSONModel from 'sap/ui/model/json/JSONModel';
import type RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';

import { fetchMock } from 'mock/window';

import { type ExtensionPointData } from '../../../../src/adp/extension';

import ExtensionPoint from '../../../../src/adp/controllers/ExtensionPoint.controller';

describe('ExtensionPoint', () => {
    beforeAll(() => {
        fetchMock.mockResolvedValue({
            json: jest.fn().mockReturnValue({ fragments: [] }),
            text: jest.fn(),
            ok: true
        });
    });

    describe('onInit', () => {
        afterEach(() => {
            jest.restoreAllMocks();
        });

        test('fills json model with data', async () => {
            fetchMock.mockResolvedValue({
                json: jest.fn().mockReturnValue({ fragments: [] }),
                text: jest.fn(),
                ok: true
            });

            const overlays = {
                getId: jest.fn().mockReturnValue('some-id')
            };

            const extPoint = new ExtensionPoint(
                'adp.extension.controllers.ExtensionPoint',
                overlays as unknown as UI5Element,
                {} as unknown as RuntimeAuthoring,
                {
                    name: 'ExtensionPoint1',
                    info: [{ name: 'ExtensionPoint1' }, { name: 'ExtensionPoint2' }]
                } as ExtensionPointData
            );

            const openSpy = jest.fn();

            await extPoint.setup({
                open: openSpy,
                setEscapeHandler: jest.fn(),
                setModel: jest.fn()
            } as unknown as Dialog);

            expect(openSpy).toHaveBeenCalledTimes(1);
        });

        test('fills json model with data when name is undefined', async () => {
            fetchMock.mockResolvedValue({
                json: jest.fn().mockReturnValue({ fragments: [] }),
                text: jest.fn(),
                ok: true
            });

            const overlays = {
                getId: jest.fn().mockReturnValue('some-id')
            };

            const extPoint = new ExtensionPoint(
                'adp.extension.controllers.ExtensionPoint',
                overlays as unknown as UI5Element,
                {} as unknown as RuntimeAuthoring,
                {
                    name: '',
                    info: [{ name: 'ExtensionPoint1' }, { name: 'ExtensionPoint2' }]
                } as ExtensionPointData
            );

            const openSpy = jest.fn();

            await extPoint.setup({
                open: openSpy,
                setEscapeHandler: jest.fn(),
                setModel: jest.fn()
            } as unknown as Dialog);

            expect(openSpy).toHaveBeenCalledTimes(1);
        });

        test('throws error message when retrieving fragments fails', async () => {
            const errorMsg = 'Could not get fragments!';
            fetchMock.mockResolvedValue({
                json: jest.fn().mockRejectedValue(new Error(errorMsg)),
                text: jest.fn(),
                ok: true
            });

            const overlays = {
                getId: jest.fn().mockReturnValue('some-id')
            };

            const extPoint = new ExtensionPoint(
                'adp.extension.controllers.ExtensionPoint',
                overlays as unknown as UI5Element,
                {} as unknown as RuntimeAuthoring,
                {
                    name: 'ExtensionPoint1',
                    info: [{ name: 'ResponsiveTableColumnsExtension|SEPMRA_C_PD_Product', defaultContent: [{}] }]
                } as ExtensionPointData
            );

            const openSpy = jest.fn();

            try {
                await extPoint.setup({
                    open: openSpy,
                    setEscapeHandler: jest.fn(),
                    setModel: jest.fn()
                } as unknown as Dialog);
            } catch (e) {
                expect(e.message).toBe(errorMsg);
            }

            expect(openSpy).not.toBeCalled;
        });
    });

    describe('onCreateBtnPress', () => {
        afterEach(() => {
            jest.restoreAllMocks();
        });

        const extensionPointName = 'some-extension-point';
        const testModel = {
            getProperty: jest.fn().mockReturnValueOnce('Share').mockReturnValueOnce(extensionPointName),
            setProperty: jest.fn()
        } as unknown as JSONModel;

        test('creates new fragment at extension point and a change', async () => {
            const resolveSpy = jest.fn();

            const extPoint = new ExtensionPoint(
                'adp.extension.controllers.ExtensionPoint',
                {} as unknown as UI5Element,
                {} as unknown as RuntimeAuthoring,
                {
                    deferred: {
                        resolve: resolveSpy
                    }
                } as unknown as ExtensionPointData
            );

            const event = {
                getSource: jest.fn().mockReturnValue({
                    setEnabled: jest.fn()
                })
            } as unknown as Event;

            fetchMock.mockResolvedValue({
                json: jest.fn().mockReturnValue([]),
                ok: true
            });

            extPoint.model = testModel;

            extPoint.handleDialogClose = jest.fn();

            await extPoint.onCreateBtnPress(event);

            expect(resolveSpy).toHaveBeenCalledWith({
                extensionPointName,
                fragment: `<core:FragmentDefinition xmlns:core='sap.ui.core'></core:FragmentDefinition>`,
                fragmentPath: 'fragments/Share.fragment.xml'
            });
        });

        test('throws error when creating new fragment', async () => {
            const errorMsg = 'Could not create XML Fragment!';
            const resolveSpy = jest.fn();

            const extPoint = new ExtensionPoint(
                'adp.extension.controllers.ExtensionPoint',
                {} as unknown as UI5Element,
                {} as unknown as RuntimeAuthoring,
                {
                    name: extensionPointName,
                    deferred: {
                        resolve: resolveSpy
                    }
                } as unknown as ExtensionPointData
            );

            const event = {
                getSource: jest.fn().mockReturnValue({
                    setEnabled: jest.fn()
                })
            } as unknown as Event;

            fetchMock.mockResolvedValue({
                json: jest.fn(),
                text: jest.fn().mockRejectedValue({ message: errorMsg }),
                ok: true
            });

            extPoint.model = testModel;

            extPoint.handleDialogClose = jest.fn();

            try {
                await extPoint.onCreateBtnPress(event);
            } catch (e) {
                expect(e.message).toBe(errorMsg);
            }

            expect(resolveSpy).not.toBeCalled;
        });
    });

    describe('onCreateBtnPress', () => {
        afterEach(() => {
            jest.restoreAllMocks();
        });

        const extensionPointName = 'ExtensionPoint1';

        test('should set correct name when user selects entry from dropdown', () => {
            const extPoint = new ExtensionPoint(
                'adp.extension.controllers.ExtensionPoint',
                {} as unknown as UI5Element,
                {} as unknown as RuntimeAuthoring,
                { info: [] } as unknown as ExtensionPointData
            );

            const setPropertySpy = jest.fn();

            const event = {
                getSource: jest.fn().mockReturnValue({
                    getSelectedItem: jest.fn().mockReturnValue({ getText: () => extensionPointName })
                })
            } as unknown as Event;

            extPoint.model = {
                setProperty: setPropertySpy
            } as unknown as JSONModel;

            extPoint.onExtensionPointHandler(event);

            expect(setPropertySpy).toHaveBeenCalledWith('/extensionPointName', extensionPointName);
        });
    });
});
