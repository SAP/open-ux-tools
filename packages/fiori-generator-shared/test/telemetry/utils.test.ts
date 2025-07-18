import { ClientFactory } from '@sap-ux/telemetry';
import { sendTelemetry, sendTelemetryBlocking, TelemetryHelper } from '../../src/telemetry';
import * as envUtils from '../../src/environment';
import { hostEnvironment } from '../../src/types';

describe('Telemetry utils', () => {
    beforeAll(() => {
        jest.spyOn(envUtils, 'getHostEnvironment').mockReturnValue(hostEnvironment.cli);
    });

    test('should call reportEvent with sample data', async () => {
        TelemetryHelper.markAppGenStartTime();
        const reportEventSpy = jest.fn();
        jest.spyOn(ClientFactory, 'getTelemetryClient').mockImplementationOnce(
            () =>
                ({
                    reportEvent: reportEventSpy
                } as any)
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
                } as any)
        );
        TelemetryHelper.createTelemetryData();
        await sendTelemetryBlocking('TEST_EVENT', TelemetryHelper.telemetryData, 'mock/path');
        expect(reportEventBlockingSpy).toHaveBeenCalledWith(expect.objectContaining({ eventName: 'TEST_EVENT' }), 2, {
            appPath: 'mock/path'
        });
    });
});
