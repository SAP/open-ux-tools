import { Logger } from '@sap-ux/logger';
import { TelemetryReporter } from '../../../src/base/telemetry-reporter';
import type { ToolsSuiteTelemetryClient } from '@sap-ux/telemetry';
import { initTelemetrySettings, ClientFactory } from '@sap-ux/telemetry';
import modulePackageJson from '../../../package.json';

jest.mock('@sap-ux/telemetry', () => {
    const telemetry = jest.requireActual('@sap-ux/telemetry');
    return {
        ...telemetry,
        initTelemetrySettings: jest.fn()
    };
});
describe('TelemetryReporter', () => {
    let telemetry: any;
    const logger = { debug: jest.fn(), warn: jest.fn(), error: jest.fn(), info: jest.fn() } as unknown as Logger & {
        warn: jest.Mock;
    };

    beforeEach(() => {
        telemetry = new TelemetryReporter('ADAPTATION_PROJECT_EVENT', logger, 'VENDOR');
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('initializeTelemetry', async () => {
        await telemetry.initializeTelemetry();
        expect(initTelemetrySettings).toBeCalledTimes(1);
        expect(initTelemetrySettings).toBeCalledWith({
            consumerModule: modulePackageJson,
            internalFeature: false,
            resourceId: 'ApplicationInsightsInstrumentationKeyPLACEH0LDER',
            watchTelemetrySettingStore: true
        });
        expect(telemetry.initialized).toBe(true);
    });

    test('reportTelemetry', () => {
        const getTelemetryClientMock = { reportEvent: jest.fn() } as unknown as ToolsSuiteTelemetryClient;
        jest.spyOn(ClientFactory, 'getTelemetryClient').mockImplementation(() => getTelemetryClientMock);
        const data = { changeType: 'addXML' };
        telemetry.initialized = true;
        telemetry.reportTelemetry(data);
        expect(getTelemetryClientMock.reportEvent).toBeCalledTimes(1);
        const eventName = {
            'eventName': 'ADAPTATION_PROJECT_EVENT',
            'measurements': {},
            'properties': { 'changeType': 'addXML', 'layer': 'VENDOR' }
        };
        expect(getTelemetryClientMock.reportEvent).toBeCalledWith(eventName, 2, { appPath: process.cwd() });
    });
});
