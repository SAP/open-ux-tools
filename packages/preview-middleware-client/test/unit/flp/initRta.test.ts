import type { RTAOptions } from 'sap/ui/rta/RuntimeAuthoring';

import FeaturesAPI from 'mock/sap/ui/fl/write/api/FeaturesAPI';
import Control from 'mock/sap/ui/core/Control';
import Utils from 'mock/sap/ui/fl/Utils';

import initRta from '../../../src/flp/initRta';
import { sapCoreMock, documentMock } from 'mock/window';

describe('flp/initRta', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('initializes RuntimeAuthoring and starts ui adaptation', async () => {
        const mockRootControl = new Control();

        documentMock.querySelector = jest
            .fn()
            .mockReturnValue({ querySelector: jest.fn().mockReturnValue({ id: '__button09' }) });
        mockRootControl.getManifest.mockReturnValue({
            'sap.app': {
                id: 'some-id'
            },
            'sap.ui5': {
                flexEnabled: true
            }
        });

        Utils.getAppComponentForControl.mockReturnValue(mockRootControl);

        const options = {
            flexSettings: {
                layer: 'CUSTOMER'
            },
            rootControl: mockRootControl,
            validateAppVersion: false
        };

        const setVisibleSpy = jest.fn();

        sapCoreMock.byId.mockReturnValue({ setVisible: setVisibleSpy });

        const pluginScript = jest.fn();

        await initRta(options as unknown as RTAOptions, pluginScript);

        expect(setVisibleSpy).toBeCalledTimes(2);
    });

    test('throws error when invalid layer is passed', async () => {
        const mockRootControl = new Control();

        mockRootControl.getManifest.mockReturnValue({
            'sap.app': {
                id: 'some-id'
            },
            'sap.ui5': {
                flexEnabled: true
            }
        });

        Utils.getAppComponentForControl.mockReturnValue(mockRootControl);

        const options = {
            flexSettings: {
                layer: 'CUSTOMER_123'
            },
            rootControl: mockRootControl,
            validateAppVersion: false
        };

        try {
            await initRta(options as unknown as RTAOptions, jest.fn());
            throw new Error('Expected checkLayer to throw, but it did not');
        } catch (e) {
            expect(e.message).toBe('An invalid layer is passed');
        }
    });

    test('throws error when invalid control is passed', async () => {
        class FakeControl {}
        const mockRootControl = new FakeControl();

        Utils.getAppComponentForControl.mockReturnValue(mockRootControl);

        const options = {
            flexSettings: {
                layer: 'CUSTOMER'
            },
            rootControl: mockRootControl,
            validateAppVersion: false
        };

        try {
            await initRta(options as unknown as RTAOptions, jest.fn());
            throw new Error('Expected checkRootControl to throw, but it did not');
        } catch (e) {
            expect(e.message).toBe('An invalid root control was passed');
        }
    });

    test('throws error when customer does not have key user rights', async () => {
        const mockRootControl = new Control();

        FeaturesAPI.isKeyUser.mockReturnValue(false);
        Utils.getAppComponentForControl.mockReturnValue(mockRootControl);
        mockRootControl.getManifest.mockReturnValue({
            'sap.app': {
                id: 'some-id'
            },
            'sap.ui5': {
                flexEnabled: true
            }
        });

        const options = {
            flexSettings: {
                layer: 'CUSTOMER'
            },
            rootControl: mockRootControl,
            validateAppVersion: false
        };

        try {
            await initRta(options as unknown as RTAOptions, jest.fn());
            throw new Error('Expected checkKeyUser to throw, but it did not');
        } catch (e) {
            expect(e.message).toBe('No key user rights found');
        }
    });

    test('throws error when flexEnabled in the manifest is false', async () => {
        const mockRootControl = new Control();

        FeaturesAPI.isKeyUser.mockReturnValue(true);
        Utils.getAppComponentForControl.mockReturnValue(mockRootControl);
        mockRootControl.getManifest.mockReturnValue({
            'sap.app': {
                id: 'some-id'
            },
            'sap.ui5': {
                flexEnabled: false
            }
        });

        const options = {
            flexSettings: {
                layer: 'CUSTOMER'
            },
            rootControl: mockRootControl,
            validateAppVersion: false
        };

        try {
            await initRta(options as unknown as RTAOptions, jest.fn());
            throw new Error('Expected checkFlexEnabled to throw, but it did not');
        } catch (e) {
            expect(e.message).toBe('This app is not enabled for key user adaptation');
        }
    });
});
