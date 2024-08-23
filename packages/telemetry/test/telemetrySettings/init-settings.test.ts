import { TelemetrySettings } from '../../src/base/config-state';
import type { ProjectInfo } from '../../src/base/types';
import { initTelemetrySettings } from '../../src/tooling-telemetry';
import * as storeMock from '@sap-ux/store';

const isAppStudioMock = jest.fn();
jest.mock('@sap-ux/btp-utils', () => {
    return {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
        ...(jest.requireActual('@sap-ux/btp-utils') as {}),
        isAppStudio: (): boolean => isAppStudioMock()
    };
});

const readFileMock = jest.fn();
jest.mock('fs', () => ({
    ...(jest.requireActual('fs') as object),
    promises: {
        readFile: (...args: []) => readFileMock(...args)
    }
}));

jest.mock('../../src/base/utils/reporting', () => {
    return {
        reportRuntimeError: (error: Error) => {
            throw error;
        },
        reportEnableTelemetryOnOff: jest.fn()
    };
});

const packageJson = {
    name: 'testProject',
    version: '0.0.1'
} as ProjectInfo;

const mockSettingFileContent = {
    'sap.ux.annotation.lsp.enableTelemetry': true,
    'sap.ux.applicationModeler.enableTelemetry': true,
    'sap.ux.help.enableTelemetry': true,
    'sap.ux.serviceModeler.enableTelemetry': true
};

describe('toolsSuiteTelemetrySettings', () => {
    afterEach(() => {
        mockSettingFileContent['sap.ux.help.enableTelemetry'] = true;
    });

    beforeEach(() => {
        isAppStudioMock.mockReset();
        readFileMock.mockReset();
        jest.clearAllMocks();
    });

    /**
     * Has existing central telemetry setting
     */
    it('Telemetry setting exists in store, enabled: true', async () => {
        const getFilesystemWatcherForSpy = jest.spyOn(storeMock, 'getFilesystemWatcherFor');
        jest.spyOn(storeMock, 'getService').mockImplementation(() =>
            Promise.resolve({
                read: () => Promise.resolve({ enableTelemetry: true })
            } as unknown as storeMock.Service<storeMock.TelemetrySetting, storeMock.TelemetrySettingKey>)
        );

        await initTelemetrySettings({
            resourceId: '',
            consumerModule: packageJson,
            internalFeature: false,
            watchTelemetrySettingStore: true
        });

        expect(readFileMock).toBeCalledTimes(0);
        expect(getFilesystemWatcherForSpy).toBeCalledTimes(1);
        expect(TelemetrySettings.consumerModuleName).toBe('testProject');
        expect(TelemetrySettings.consumerModuleVersion).toBe('0.0.1');
        expect(TelemetrySettings.telemetryEnabled).toBe(true);
    });

    it('Telemetry setting exists in store, enabled: false', async () => {
        jest.spyOn(storeMock, 'getService').mockImplementation(() =>
            Promise.resolve({
                read: () => Promise.resolve({ enableTelemetry: false })
            } as unknown as storeMock.Service<storeMock.TelemetrySetting, storeMock.TelemetrySettingKey>)
        );

        await initTelemetrySettings({
            resourceId: undefined,
            consumerModule: packageJson,
            internalFeature: false,
            watchTelemetrySettingStore: false
        });

        expect(readFileMock).toBeCalledTimes(0);
        expect(TelemetrySettings.telemetryEnabled).toBe(false);
        expect(TelemetrySettings.consumerModuleName).toBe('testProject');
        expect(TelemetrySettings.consumerModuleVersion).toBe('0.0.1');
        expect(TelemetrySettings.azureInstrumentationKey).toBe('');
    });

    /**
     * No central telemetry setting found. Read config from deprecated vscode extension settings.
     * Set enableTelemetry to fase if any of the vscode extension setting is false.
     */
    it('Telemetry setting does not exist in store, at least one of legacy telemetry setting is disabled', async () => {
        const getFilesystemWatcherForSpy = jest.spyOn(storeMock, 'getFilesystemWatcherFor');
        mockSettingFileContent['sap.ux.help.enableTelemetry'] = false;
        jest.spyOn(storeMock, 'getService').mockImplementation(() =>
            Promise.resolve({
                read: () => Promise.resolve(undefined),
                write: () => jest.fn()
            } as unknown as storeMock.Service<storeMock.TelemetrySetting, storeMock.TelemetrySettingKey>)
        );
        readFileMock.mockReturnValueOnce(Promise.resolve(JSON.stringify(mockSettingFileContent)));

        await initTelemetrySettings({
            resourceId: 'abc-123',
            consumerModule: packageJson,
            internalFeature: false,
            watchTelemetrySettingStore: false
        });

        expect(readFileMock).toBeCalledTimes(1);
        expect(readFileMock).toBeCalledWith(expect.stringContaining('settings.json'), 'utf-8');
        expect(getFilesystemWatcherForSpy).toBeCalledTimes(0);
        expect(TelemetrySettings.telemetryEnabled).toBe(false);
        expect(TelemetrySettings.consumerModuleName).toBe('testProject');
        expect(TelemetrySettings.consumerModuleVersion).toBe('0.0.1');
        expect(TelemetrySettings.azureInstrumentationKey).toBe('abc-123');
    });

    /**
     * No central telemetry setting found. Read config from deprecated vscode extension settings.
     * Set enableTelemetry to true if all of the vscode extension setting are true.
     */
    it('Telemetry setting does not exist in store, all legacy telemetry settings are enabled', async () => {
        jest.spyOn(storeMock, 'getService').mockImplementation(() =>
            Promise.resolve({
                read: () => Promise.resolve(undefined),
                write: () => jest.fn()
            } as unknown as storeMock.Service<storeMock.TelemetrySetting, storeMock.TelemetrySettingKey>)
        );
        readFileMock.mockReturnValueOnce(Promise.resolve(JSON.stringify(mockSettingFileContent)));

        await initTelemetrySettings({
            resourceId: '',
            consumerModule: packageJson,
            internalFeature: false,
            watchTelemetrySettingStore: false
        });

        expect(readFileMock).toBeCalledTimes(1);
        expect(readFileMock).toBeCalledWith(expect.stringContaining('settings.json'), 'utf-8');
        expect(TelemetrySettings.telemetryEnabled).toBe(true);
        expect(TelemetrySettings.consumerModuleName).toBe('testProject');
        expect(TelemetrySettings.consumerModuleVersion).toBe('0.0.1');
    });

    /**
     * No central telemetry setting found. No deprecated vscode extension settings.
     */
    it('Telemetry setting does not exist in store, no legacy settings found', async () => {
        jest.spyOn(storeMock, 'getService').mockImplementation(() =>
            Promise.resolve({
                read: () => Promise.resolve(undefined),
                write: () => jest.fn()
            } as unknown as storeMock.Service<storeMock.TelemetrySetting, storeMock.TelemetrySettingKey>)
        );
        readFileMock.mockRejectedValueOnce(new Error('MockError: No file found'));

        await initTelemetrySettings({
            resourceId: '',
            consumerModule: packageJson,
            internalFeature: false,
            watchTelemetrySettingStore: false
        });
        expect(readFileMock).toBeCalledTimes(1);
        expect(readFileMock).toBeCalledWith(expect.stringContaining('settings.json'), 'utf-8');
        expect(TelemetrySettings.telemetryEnabled).toBe(true);
        expect(TelemetrySettings.consumerModuleName).toBe('testProject');
        expect(TelemetrySettings.consumerModuleVersion).toBe('0.0.1');
    });

    /**
     * No central telemetry setting found in SBAS environment
     */
    it('Telemetry setting does not exist in store for SBAS env, all legacy setting enabled', async () => {
        isAppStudioMock.mockReturnValue(true);
        jest.spyOn(storeMock, 'getService').mockImplementation(() =>
            Promise.resolve({
                read: () => Promise.resolve(undefined),
                write: () => jest.fn()
            } as unknown as storeMock.Service<storeMock.TelemetrySetting, storeMock.TelemetrySettingKey>)
        );
        readFileMock.mockReturnValueOnce(Promise.resolve(JSON.stringify(mockSettingFileContent)));

        await initTelemetrySettings({
            resourceId: '',
            consumerModule: packageJson,
            internalFeature: false,
            watchTelemetrySettingStore: false
        });
        expect(readFileMock).toBeCalledTimes(1);
        expect(readFileMock).toBeCalledWith(expect.stringContaining('settings.json'), 'utf-8');
        expect(readFileMock).toBeCalledWith(expect.stringContaining('theia'), 'utf-8');
        expect(TelemetrySettings.telemetryEnabled).toBe(true);
        expect(TelemetrySettings.consumerModuleName).toBe('testProject');
        expect(TelemetrySettings.consumerModuleVersion).toBe('0.0.1');
    });

    it('Telemetry setting does not exist in store for SBAS env, one legacy setting disabled', async () => {
        mockSettingFileContent['sap.ux.help.enableTelemetry'] = false;
        isAppStudioMock.mockReturnValue(true);
        jest.spyOn(storeMock, 'getService').mockImplementation(() =>
            Promise.resolve({
                read: () => Promise.resolve(undefined),
                write: () => jest.fn()
            } as unknown as storeMock.Service<storeMock.TelemetrySetting, storeMock.TelemetrySettingKey>)
        );
        readFileMock.mockReturnValueOnce(Promise.resolve(JSON.stringify(mockSettingFileContent)));

        await initTelemetrySettings({
            resourceId: '',
            consumerModule: packageJson,
            internalFeature: false,
            watchTelemetrySettingStore: false
        });
        expect(readFileMock).toBeCalledTimes(1);
        expect(readFileMock).toBeCalledWith(expect.stringContaining('settings.json'), 'utf-8');
        expect(readFileMock).toBeCalledWith(expect.stringContaining('theia'), 'utf-8');
        expect(TelemetrySettings.telemetryEnabled).toBe(false);
        expect(TelemetrySettings.consumerModuleName).toBe('testProject');
        expect(TelemetrySettings.consumerModuleVersion).toBe('0.0.1');
    });

    /**
     * No central telemetry setting found. Unknown OS or platform
     */
    it('Telemetry setting does not exist in store, unknown OS or platform', async () => {
        const originalPlatform = process.platform;
        Object.defineProperty(process, 'platform', {
            value: 'Unknown'
        });

        jest.spyOn(storeMock, 'getService').mockImplementation(() =>
            Promise.resolve({
                read: () => Promise.resolve(undefined),
                write: () => jest.fn()
            } as unknown as storeMock.Service<storeMock.TelemetrySetting, storeMock.TelemetrySettingKey>)
        );
        readFileMock.mockReturnValueOnce(Promise.resolve(JSON.stringify(mockSettingFileContent)));

        await initTelemetrySettings({
            resourceId: '',
            consumerModule: packageJson,
            internalFeature: false,
            watchTelemetrySettingStore: false
        });
        expect(readFileMock).toBeCalledTimes(0);
        expect(TelemetrySettings.telemetryEnabled).toBe(true);
        expect(TelemetrySettings.consumerModuleName).toBe('testProject');
        expect(TelemetrySettings.consumerModuleVersion).toBe('0.0.1');

        Object.defineProperty(process, 'platform', {
            value: originalPlatform
        });
    });
});
