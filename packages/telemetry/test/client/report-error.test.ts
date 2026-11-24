import { jest } from '@jest/globals';

jest.unstable_mockModule('applicationinsights', () => {
    class TelemetryClient {
        public config: any = { samplingPercentage: 0 };
        public context: any = { tags: {} };
        public setUseDiskRetryCaching = jest.fn();
        public trackEvent = () => {
            throw new TypeError("Cannot read properties of undefined (reading 'trackEvent')");
        };
        public flush = jest.fn();
    }
    return { TelemetryClient };
});

const { ClientFactory } = await import('../../src/base/client/index.js');
const { TelemetrySettings } = await import('../../src/base/config-state.js');
const { EventName } = await import('../../src/base/types/event-name.js');
const { SampleRate } = await import('../../src/base/types/sample-rate.js');

describe('Telemetry client without a usable instrumentation key', () => {
    beforeEach(() => {
        TelemetrySettings.telemetryEnabled = true;
    });

    test('report() logs a warning instead of throwing', async () => {
        const client = ClientFactory.getTelemetryClient();
        await expect(client.report(EventName.Test, {}, {}, SampleRate.NoSampling)).resolves.toBeUndefined();
    });

    test('reportBlocking() logs a warning instead of throwing', async () => {
        const client = ClientFactory.getTelemetryClient();
        await expect(client.reportBlocking(EventName.Test, {}, {}, SampleRate.NoSampling)).resolves.toBeUndefined();
    });
});
