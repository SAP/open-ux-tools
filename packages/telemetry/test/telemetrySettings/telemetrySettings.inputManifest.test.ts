import { TelemetrySettings } from '../../src/base/config-state';
TelemetrySettings.azureInstrumentationKey = 'AzureInstrumentationKey';
TelemetrySettings.telemetryLibName = '@sap-ux/telemetry';
TelemetrySettings.telemetryLibVersion = '0.0.1';

import type { ProjectInfo } from '../../src/base/types/';
import { getTelemetrySetting, initTelemetrySettings } from '../../src/tooling-telemetry';
import * as storeMock from '@sap-ux/store';

const isAppStudioMock = jest.fn();
jest.mock('@sap-ux/btp-utils', () => {
    return {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
        ...(jest.requireActual('@sap-ux/btp-utils') as {}),
        isAppStudio: (): boolean => isAppStudioMock()
    };
});

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
    'sap.ux.help.enableTelemetry': false,
    'sap.ux.serviceModeler.enableTelemetry': true
};

const readFileMock = jest.fn(),
    mkdirSyncMock = jest.fn(),
    writeFileSyncMock = jest.fn(),
    readFileSyncMock = jest.fn(),
    existsSyncMock = jest.fn();

jest.mock('fs', () => ({
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    ...(jest.requireActual('fs') as object),
    promises: {
        readFile: (...args: []) => readFileMock(...args)
    },
    mkdirSync: (...args: []) => mkdirSyncMock(...args),
    writeFileSync: (...args: []) => writeFileSyncMock(...args),
    readFileSync: (...args: []) => readFileSyncMock(...args),
    existsSync: (...args: []) => existsSyncMock(...args)
}));

const telemetrySettingFileContent = JSON.stringify({
    telemetrysettings: {
        telemetrySetting: {
            enableTelemetry: true
        }
    }
});

describe('toolsSuiteTelemetrySettings', () => {
    afterEach(() => {
        delete process.env['TOOLSUITE_INTERNAL'];
    });

    beforeEach(() => {
        readFileMock.mockReset();
        mkdirSyncMock.mockReset();
        writeFileSyncMock.mockReset();
        readFileSyncMock.mockReset();
        isAppStudioMock.mockReset();
        existsSyncMock.mockReset();
        mockSettingFileContent['sap.ux.help.enableTelemetry'] = false;
    });

    /**
     * Has existing central telemetry setting
     */
    it('Read module package.json from option - central telemetry setting case 1', async () => {
        existsSyncMock.mockImplementation(() => true);
        readFileSyncMock.mockImplementation((filepath: string) => {
            if (filepath && filepath.includes('telemetrysettings.json')) {
                return telemetrySettingFileContent;
            }
        });

        await initTelemetrySettings({
            modulePackageJson: packageJson
        });
        expect(readFileMock).toBeCalledTimes(0);
        expect(writeFileSyncMock).toBeCalledTimes(0);
        expect(TelemetrySettings.consumerModuleName).toBe('testProject');
        expect(TelemetrySettings.consumerModuleVersion).toBe('0.0.1');
        expect(TelemetrySettings.telemetryEnabled).toBe(true);
    });

    /**
     * No central telemetry setting found. Read config from deprecated vscode extension settings.
     * Set enableTelemetry to fase if any of the vscode extension setting is false.
     */
    it('Read module package.json from option - no central telemetry setting case 1', async () => {
        existsSyncMock.mockImplementation(() => false);
        readFileMock.mockReturnValue(new Promise((resolve) => resolve(JSON.stringify(mockSettingFileContent))));

        await initTelemetrySettings({
            modulePackageJson: packageJson
        });
        expect(readFileMock).toBeCalledTimes(1);
        expect(readFileMock).toBeCalledWith(expect.stringContaining('settings.json'), 'utf-8');
        expect(writeFileSyncMock).toBeCalledTimes(1);
        expect(writeFileSyncMock).toBeCalledWith(
            expect.stringContaining('telemetrysettings.json'),
            expect.stringContaining(`"enableTelemetry": false`)
        );
        expect(readFileSyncMock).toBeCalledTimes(2);
        expect(TelemetrySettings.consumerModuleName).toBe('testProject');
        expect(TelemetrySettings.consumerModuleVersion).toBe('0.0.1');
    });

    /**
     * No central telemetry setting found. Read config from deprecated vscode extension settings.
     * Set enableTelemetry to true if all of the vscode extension setting are true.
     */
    it('Read module package.json from option - no central telemetry setting case 2', async () => {
        mockSettingFileContent['sap.ux.help.enableTelemetry'] = true;
        existsSyncMock.mockImplementation(() => false);
        readFileMock.mockReturnValue(new Promise((resolve) => resolve(JSON.stringify(mockSettingFileContent))));

        await initTelemetrySettings({
            modulePackageJson: packageJson
        });
        expect(readFileMock).toBeCalledTimes(1);
        expect(readFileMock).toBeCalledWith(expect.stringContaining('settings.json'), 'utf-8');
        expect(writeFileSyncMock).toBeCalledTimes(1);
        expect(writeFileSyncMock).toBeCalledWith(
            expect.stringContaining('telemetrysettings.json'),
            expect.stringContaining(`"enableTelemetry": true`)
        );
        expect(readFileSyncMock).toBeCalledTimes(2);
        expect(TelemetrySettings.consumerModuleName).toBe('testProject');
        expect(TelemetrySettings.consumerModuleVersion).toBe('0.0.1');
    });

    /**
     * No central telemetry setting found. No deprecated vscode extension settings.
     */
    it('Read module package.json from option - no central telemetry setting case 3', async () => {
        existsSyncMock.mockImplementation(() => false);
        readFileMock.mockReturnValue(new Promise((resolve, reject) => reject(new Error('MockError: No file found'))));

        await initTelemetrySettings({
            modulePackageJson: packageJson
        });
        expect(readFileMock).toBeCalledTimes(1);
        expect(readFileMock).toBeCalledWith(expect.stringContaining('settings.json'), 'utf-8');
        expect(writeFileSyncMock).toBeCalledTimes(1);
        expect(writeFileSyncMock).toBeCalledWith(
            expect.stringContaining('telemetrysettings.json'),
            expect.stringContaining(`"enableTelemetry": true`)
        );
        expect(readFileSyncMock).toBeCalledTimes(2);
        expect(TelemetrySettings.consumerModuleName).toBe('testProject');
        expect(TelemetrySettings.consumerModuleVersion).toBe('0.0.1');
    });

    /**
     * No central telemetry setting found in SBAS environment
     */
    it('Read module package.json from option - no central telemetry setting case 4', async () => {
        isAppStudioMock.mockReturnValue(true);
        mockSettingFileContent['sap.ux.help.enableTelemetry'] = true;
        readFileMock.mockReturnValue(new Promise((resolve) => resolve(JSON.stringify(mockSettingFileContent))));
        existsSyncMock.mockImplementation(() => false);

        await initTelemetrySettings({
            modulePackageJson: packageJson
        });
        expect(readFileMock).toBeCalledTimes(1);
        expect(readFileMock).toBeCalledWith(expect.stringContaining('settings.json'), 'utf-8');
        expect(readFileMock).toBeCalledWith(expect.stringContaining('.theia'), 'utf-8');
        expect(writeFileSyncMock).toBeCalledTimes(1);
        expect(writeFileSyncMock).toBeCalledWith(
            expect.stringContaining('telemetrysettings.json'),
            expect.stringContaining(`"enableTelemetry": true`)
        );
        expect(readFileSyncMock).toBeCalledTimes(2);
        expect(TelemetrySettings.consumerModuleName).toBe('testProject');
        expect(TelemetrySettings.consumerModuleVersion).toBe('0.0.1');
    });

    /**
     * No central telemetry setting found. Unknown OS
     */
    it('Read module package.json from option - no central telemetry setting case 5', async () => {
        const originalPlatform = process.platform;
        Object.defineProperty(process, 'platform', {
            value: 'Unknown'
        });

        mockSettingFileContent['sap.ux.help.enableTelemetry'] = true;
        readFileMock.mockReturnValue(new Promise((resolve) => resolve(JSON.stringify(mockSettingFileContent))));
        existsSyncMock.mockImplementation(() => false);

        await initTelemetrySettings({
            modulePackageJson: packageJson
        });
        expect(readFileMock).toBeCalledTimes(0);
        expect(writeFileSyncMock).toBeCalledTimes(1);
        expect(writeFileSyncMock).toBeCalledWith(
            expect.stringContaining('telemetrysettings.json'),
            expect.stringContaining(`"enableTelemetry": true`)
        );
        expect(readFileSyncMock).toBeCalledTimes(2);
        expect(TelemetrySettings.consumerModuleName).toBe('testProject');
        expect(TelemetrySettings.consumerModuleVersion).toBe('0.0.1');

        Object.defineProperty(process, 'platform', {
            value: originalPlatform
        });
    });
});

describe('Tests for getTelemetrySetting()', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('Telemetry setting should be enabled', async () => {
        // Mock setup
        jest.spyOn(storeMock, 'getService').mockImplementation(() =>
            Promise.resolve({
                read: () => Promise.resolve({ enableTelemetry: true })
            } as unknown as storeMock.Service<storeMock.TelemetrySetting, storeMock.TelemetrySettingKey>)
        );

        // Test execution
        const setting = await getTelemetrySetting();

        // Check results
        expect(setting?.enableTelemetry).toBe(true);
    });

    it('Telemetry setting should be disabled', async () => {
        // Mock setup
        jest.spyOn(storeMock, 'getService').mockImplementation(() =>
            Promise.resolve({
                read: () => Promise.resolve({ enableTelemetry: false })
            } as unknown as storeMock.Service<storeMock.TelemetrySetting, storeMock.TelemetrySettingKey>)
        );

        // Test execution
        const setting = await getTelemetrySetting();

        // Check results
        expect(setting?.enableTelemetry).toBe(false);
    });

    it('Telemetry setting should be undefined', async () => {
        // Mock setup
        jest.spyOn(storeMock, 'getService').mockImplementation(() =>
            Promise.resolve({
                read: () => Promise.resolve(undefined)
            } as unknown as storeMock.Service<storeMock.TelemetrySetting, storeMock.TelemetrySettingKey>)
        );

        // Test execution
        const setting = await getTelemetrySetting();

        // Check results
        expect(setting).toBe(undefined);
    });

    it('Error thrown while getTelemetrySetting() - should be undefined', async () => {
        // Mock setup
        jest.spyOn(storeMock, 'getService').mockImplementation(() =>
            Promise.resolve({
                read: () => Promise.reject()
            } as unknown as storeMock.Service<storeMock.TelemetrySetting, storeMock.TelemetrySettingKey>)
        );

        // Test execution
        const setting = await getTelemetrySetting();

        // Check results
        expect(setting).toBe(undefined);
    });
});
