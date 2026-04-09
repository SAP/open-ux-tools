import { jest } from '@jest/globals';
import type { ProjectInfo } from '../../src/base/types';

jest.unstable_mockModule('applicationinsights', () => {
    class TelemetryClient {
        public config: any;
        public channel: any;
        public addTelemetryProcessor: any;
        public trackEvent: any;
        constructor() {
            this.config = { samplingPercentage: 0 };
            this.channel = { setUseDiskRetryCaching: jest.fn() };
            this.addTelemetryProcessor = jest.fn();
            this.trackEvent = jest.fn();
        }
    }
    return { TelemetryClient };
});

const isAppStudioMock = jest.fn();
jest.unstable_mockModule('@sap-ux/btp-utils', () => ({
    isAppStudio: (): boolean => isAppStudioMock()
}));

const actualFs = await import('node:fs');

const readFileMock = jest.fn();
jest.unstable_mockModule('node:fs', () => ({
    ...actualFs,
    default: {
        ...actualFs.default,
        promises: {
            ...actualFs.default.promises,
            readFile: (...args: any[]) => readFileMock(...args)
        }
    },
    promises: {
        ...actualFs.promises,
        readFile: (...args: any[]) => readFileMock(...args)
    }
}));

const mockReportRuntimeError = jest.fn().mockImplementation((error: Error) => {
    throw error;
});
const mockReportEnableTelemetryOnOff = jest.fn();
jest.unstable_mockModule('../../src/base/utils/reporting', () => ({
    reportRuntimeError: mockReportRuntimeError,
    reportEnableTelemetryOnOff: mockReportEnableTelemetryOnOff
}));

const mockGetService = jest.fn();
const mockGetFilesystemWatcherFor = jest.fn();
jest.unstable_mockModule('@sap-ux/store', () => ({
    getService: mockGetService,
    getFilesystemWatcherFor: mockGetFilesystemWatcherFor,
    Entity: { TelemetrySetting: 'telemetrySetting' },
    TelemetrySetting: class {
        enableTelemetry: boolean;
        constructor(opts: any) {
            this.enableTelemetry = opts?.enableTelemetry;
        }
    },
    TelemetrySettingKey: class {}
}));

const { TelemetrySettings } = await import('../../src/base/config-state');
const { initTelemetrySettings } = await import('../../src/tooling-telemetry');

const packageJson = {
    name: 'testProject',
    version: '0.0.1'
} as ProjectInfo;

const mockSettingFileContent: Record<string, boolean> = {
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
        mockGetService.mockResolvedValue({
            read: () => Promise.resolve({ enableTelemetry: true })
        });

        await initTelemetrySettings({
            resourceId: '',
            consumerModule: packageJson,
            internalFeature: false,
            watchTelemetrySettingStore: true
        });

        expect(readFileMock).toHaveBeenCalledTimes(0);
        expect(mockGetFilesystemWatcherFor).toHaveBeenCalledTimes(1);
        expect(TelemetrySettings.consumerModuleName).toBe('testProject');
        expect(TelemetrySettings.consumerModuleVersion).toBe('0.0.1');
        expect(TelemetrySettings.telemetryEnabled).toBe(true);
    });

    it('Telemetry setting exists in store, enabled: false', async () => {
        mockGetService.mockResolvedValue({
            read: () => Promise.resolve({ enableTelemetry: false })
        });

        await initTelemetrySettings({
            resourceId: undefined,
            consumerModule: packageJson,
            internalFeature: false,
            watchTelemetrySettingStore: false
        });

        expect(readFileMock).toHaveBeenCalledTimes(0);
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
        mockSettingFileContent['sap.ux.help.enableTelemetry'] = false;
        mockGetService.mockResolvedValue({
            read: () => Promise.resolve(undefined),
            write: () => jest.fn()
        });
        readFileMock.mockReturnValueOnce(Promise.resolve(JSON.stringify(mockSettingFileContent)));

        await initTelemetrySettings({
            resourceId: 'abc-123',
            consumerModule: packageJson,
            internalFeature: false,
            watchTelemetrySettingStore: false
        });

        expect(readFileMock).toHaveBeenCalledTimes(1);
        expect(readFileMock).toHaveBeenCalledWith(expect.stringContaining('settings.json'), 'utf-8');
        expect(mockGetFilesystemWatcherFor).toHaveBeenCalledTimes(0);
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
        mockGetService.mockResolvedValue({
            read: () => Promise.resolve(undefined),
            write: () => jest.fn()
        });
        readFileMock.mockReturnValueOnce(Promise.resolve(JSON.stringify(mockSettingFileContent)));

        await initTelemetrySettings({
            resourceId: '',
            consumerModule: packageJson,
            internalFeature: false,
            watchTelemetrySettingStore: false
        });

        expect(readFileMock).toHaveBeenCalledTimes(1);
        expect(readFileMock).toHaveBeenCalledWith(expect.stringContaining('settings.json'), 'utf-8');
        expect(TelemetrySettings.telemetryEnabled).toBe(true);
        expect(TelemetrySettings.consumerModuleName).toBe('testProject');
        expect(TelemetrySettings.consumerModuleVersion).toBe('0.0.1');
    });

    /**
     * No central telemetry setting found. No deprecated vscode extension settings.
     */
    it('Telemetry setting does not exist in store, no legacy settings found', async () => {
        mockGetService.mockResolvedValue({
            read: () => Promise.resolve(undefined),
            write: () => jest.fn()
        });
        readFileMock.mockRejectedValueOnce(new Error('MockError: No file found'));

        await initTelemetrySettings({
            resourceId: '',
            consumerModule: packageJson,
            internalFeature: false,
            watchTelemetrySettingStore: false
        });
        expect(readFileMock).toHaveBeenCalledTimes(1);
        expect(readFileMock).toHaveBeenCalledWith(expect.stringContaining('settings.json'), 'utf-8');
        expect(TelemetrySettings.telemetryEnabled).toBe(true);
        expect(TelemetrySettings.consumerModuleName).toBe('testProject');
        expect(TelemetrySettings.consumerModuleVersion).toBe('0.0.1');
    });

    /**
     * No central telemetry setting found in SBAS environment
     */
    it('Telemetry setting does not exist in store for SBAS env, all legacy setting enabled', async () => {
        isAppStudioMock.mockReturnValue(true);
        mockGetService.mockResolvedValue({
            read: () => Promise.resolve(undefined),
            write: () => jest.fn()
        });
        readFileMock.mockReturnValueOnce(Promise.resolve(JSON.stringify(mockSettingFileContent)));

        await initTelemetrySettings({
            resourceId: '',
            consumerModule: packageJson,
            internalFeature: false,
            watchTelemetrySettingStore: false
        });
        expect(readFileMock).toHaveBeenCalledTimes(1);
        expect(readFileMock).toHaveBeenCalledWith(expect.stringContaining('settings.json'), 'utf-8');
        expect(readFileMock).toHaveBeenCalledWith(expect.stringContaining('theia'), 'utf-8');
        expect(TelemetrySettings.telemetryEnabled).toBe(true);
        expect(TelemetrySettings.consumerModuleName).toBe('testProject');
        expect(TelemetrySettings.consumerModuleVersion).toBe('0.0.1');
    });

    it('Telemetry setting does not exist in store for SBAS env, one legacy setting disabled', async () => {
        mockSettingFileContent['sap.ux.help.enableTelemetry'] = false;
        isAppStudioMock.mockReturnValue(true);
        mockGetService.mockResolvedValue({
            read: () => Promise.resolve(undefined),
            write: () => jest.fn()
        });
        readFileMock.mockReturnValueOnce(Promise.resolve(JSON.stringify(mockSettingFileContent)));

        await initTelemetrySettings({
            resourceId: '',
            consumerModule: packageJson,
            internalFeature: false,
            watchTelemetrySettingStore: false
        });
        expect(readFileMock).toHaveBeenCalledTimes(1);
        expect(readFileMock).toHaveBeenCalledWith(expect.stringContaining('settings.json'), 'utf-8');
        expect(readFileMock).toHaveBeenCalledWith(expect.stringContaining('theia'), 'utf-8');
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

        mockGetService.mockResolvedValue({
            read: () => Promise.resolve(undefined),
            write: () => jest.fn()
        });
        readFileMock.mockReturnValueOnce(Promise.resolve(JSON.stringify(mockSettingFileContent)));

        await initTelemetrySettings({
            resourceId: '',
            consumerModule: packageJson,
            internalFeature: false,
            watchTelemetrySettingStore: false
        });
        expect(readFileMock).toHaveBeenCalledTimes(0);
        expect(TelemetrySettings.telemetryEnabled).toBe(true);
        expect(TelemetrySettings.consumerModuleName).toBe('testProject');
        expect(TelemetrySettings.consumerModuleVersion).toBe('0.0.1');

        Object.defineProperty(process, 'platform', {
            value: originalPlatform
        });
    });
});
