import { jest } from '@jest/globals';
import type { Client } from '../../src/base/client/client';

const spyTrackEvent = jest.fn();

jest.unstable_mockModule('applicationinsights', () => {
    class TelemetryClient {
        public config: any;
        public channel: any;
        public addTelemetryProcessor: any;
        public trackEvent: any;
        constructor() {
            this.config = {
                samplingPercentage: 0
            };
            this.channel = {
                setUseDiskRetryCaching: jest.fn()
            };
            this.addTelemetryProcessor = (fn: any) => {
                fn({ tags: {} });
            };
            this.trackEvent = (event: any) => spyTrackEvent(event);
        }
    }
    return { TelemetryClient };
});

const { ClientFactory } = await import('../../src/base/client');
const { TelemetrySettings } = await import('../../src/base/config-state');

describe('ClientFactory Tests', () => {
    test('Test function getTelemetryClient()', () => {
        const telemetryClient: Client = ClientFactory.getTelemetryClient();

        const appKey = telemetryClient.getApplicationKey();
        const extensionName = telemetryClient.getExtensionName();
        const extensionVersion = telemetryClient.getExtensionVersion();
        // Triggered from test instead of real extension, so not possible to init client with extension info.
        // Fall back to use telemetry module package info.
        expect(appKey).toEqual(TelemetrySettings.azureInstrumentationKey);
        expect(extensionName).toEqual(TelemetrySettings.consumerModuleName);
        expect(extensionVersion).toEqual(TelemetrySettings.consumerModuleVersion);

        // Singleton
        const telemetryClient2: Client = ClientFactory.getTelemetryClient();
        expect(telemetryClient).toEqual(telemetryClient2);
    });
});
