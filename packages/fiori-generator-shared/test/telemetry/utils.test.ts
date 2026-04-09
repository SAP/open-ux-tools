import { jest } from '@jest/globals';
import { hostEnvironment } from '../../src/types';

jest.unstable_mockModule('@vscode-logging/logger', () => ({
    getExtensionLogger: jest.fn()
}));

const mockGetHostEnvironment = jest.fn();
jest.unstable_mockModule('../../src/environment', () => ({
    getHostEnvironment: mockGetHostEnvironment,
    isCli: jest.fn()
}));

const { ClientFactory } = await import('@sap-ux/telemetry');
const { sendTelemetry, sendTelemetryBlocking, TelemetryHelper } = await import('../../src/telemetry');

describe('Telemetry utils', () => {
    beforeAll(() => {
        mockGetHostEnvironment.mockReturnValue(hostEnvironment.cli);
    });

    test('should call reportEvent with sample data', async () => {
        TelemetryHelper.markAppGenStartTime();
        const reportEventSpy = jest.fn();
        jest.spyOn(ClientFactory, 'getTelemetryClient').mockImplementationOnce(
            () =>
                ({
                    reportEvent: reportEventSpy
                }) as any
        );
        TelemetryHelper.createTelemetryData();
        await sendTelemetry('TEST_EVENT', TelemetryHelper.telemetryData, 'mock/path');
        expect(reportEventSpy).toHaveBeenCalledWith(expect.objectContaining({ eventName: 'TEST_EVENT' }), 2, {
            appPath: 'mock/path'
        });
    });

    test('should call reportEventBlocking with sample data', async () => {
        const reportEventBlockingSpy = jest.fn();
        jest.spyOn(ClientFactory, 'getTelemetryClient').mockImplementationOnce(
            () =>
                ({
                    reportEventBlocking: reportEventBlockingSpy
                }) as any
        );
        TelemetryHelper.createTelemetryData();
        await sendTelemetryBlocking('TEST_EVENT', TelemetryHelper.telemetryData, 'mock/path');
        expect(reportEventBlockingSpy).toHaveBeenCalledWith(expect.objectContaining({ eventName: 'TEST_EVENT' }), 2, {
            appPath: 'mock/path'
        });
    });
});
