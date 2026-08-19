import { jest } from '@jest/globals';
import type { Client } from '../../src/base/client/client.js';

const spyTrackEvent = jest.fn();

jest.unstable_mockModule('applicationinsights', () => {
    class TelemetryClient {
        public config: any;
        public context: any;
        public setUseDiskRetryCaching: any;
        public trackEvent: any;
        constructor() {
            this.config = {
                samplingPercentage: 0
            };
            this.context = { tags: {} };
            this.setUseDiskRetryCaching = jest.fn();
            this.trackEvent = (event: any) => spyTrackEvent(event);
        }
    }
    return { TelemetryClient };
});

const { ClientFactory } = await import('../../src/base/client/index.js');
const { TelemetrySettings } = await import('../../src/base/config-state.js');

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

    test('Built connection string includes configured Ingestion/Live endpoints', () => {
        TelemetrySettings.azureInstrumentationKey = 'test-key';
        TelemetrySettings.azureIngestionEndpoint = 'https://custom-ingest.example.com/';
        TelemetrySettings.azureLiveEndpoint = 'https://custom-live.example.com/';
        ClientFactory['clientMap'].clear();

        const connectionString = ClientFactory.getTelemetryClient().getApplicationKey();

        expect(connectionString).toContain('InstrumentationKey=test-key');
        expect(connectionString).toContain('IngestionEndpoint=https://custom-ingest.example.com/');
        expect(connectionString).toContain('LiveEndpoint=https://custom-live.example.com/');
    });
});
