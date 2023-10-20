import type UI5Element from 'sap/ui/core/Element';
import type RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';

import { fetchMock } from 'mock/window';

import { type ExtensionPointData } from '../../../../src/adp/extension-point';

import ExtensionPoint from '../../../../src/adp/controllers/ExtensionPoint.controller';
import type JSONModel from 'sap/ui/model/json/JSONModel';
import Event from 'sap/ui/base/Event';

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
                {} as ExtensionPointData
            );

            const openSpy = jest.fn();
            extPoint.byId = jest.fn().mockReturnValue({
                open: openSpy
            });

            await extPoint.onInit();

            expect(openSpy).toHaveBeenCalledTimes(1);
        });

        test('fills json model with data', async () => {
            const errorMsg = 'Could not get fragments!';
            fetchMock.mockResolvedValue({
                json: jest.fn().mockRejectedValue({ message: errorMsg }),
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
                {} as ExtensionPointData
            );

            const openSpy = jest.fn();
            extPoint.byId = jest.fn().mockReturnValue({
                open: openSpy
            });

            try {
                await extPoint.onInit();
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

        const testModel = {
            getProperty: jest.fn().mockReturnValueOnce('Share'),
            setProperty: jest.fn()
        } as unknown as JSONModel;

        test('creates new fragment at extension point and a change', async () => {
            const resolveSpy = jest.fn();
            const extensionPointName = 'some-extension-point';

            const extPoint = new ExtensionPoint(
                'adp.extension.controllers.ExtensionPoint',
                {} as unknown as UI5Element,
                {} as unknown as RuntimeAuthoring,
                {
                    name: extensionPointName,
                    deffered: {
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
                text: jest.fn().mockReturnValue('XML Fragment was created!'),
                ok: true
            });

            extPoint.model = testModel;

            extPoint.handleDialogClose = jest.fn();

            await extPoint.onCreateBtnPress(event);

            expect(resolveSpy).toHaveBeenCalledWith({
                extensionPointName,
                fragmentPath: 'fragments/Share.fragment.xml'
            });
        });

        test('throws error when creating new fragment', async () => {
            const errorMsg = 'Could not create XML Fragment!';
            const resolveSpy = jest.fn();
            const extensionPointName = 'some-extension-point';

            const extPoint = new ExtensionPoint(
                'adp.extension.controllers.ExtensionPoint',
                {} as unknown as UI5Element,
                {} as unknown as RuntimeAuthoring,
                {
                    name: extensionPointName,
                    deffered: {
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
});
