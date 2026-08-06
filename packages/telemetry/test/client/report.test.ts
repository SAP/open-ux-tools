import { jest } from '@jest/globals';

const spyTrackEvent = jest.fn();

jest.unstable_mockModule('applicationinsights', () => {
    class TelemetryClient {
        public config: any;
        public setUseDiskRetryCaching: any;
        public addTelemetryProcessor: any;
        public trackEvent: any;
        constructor() {
            this.config = {
                samplingPercentage: 0
            };
            this.setUseDiskRetryCaching = jest.fn();
            this.addTelemetryProcessor = (fn: any) => {
                fn({ tags: {} });
            };
            this.trackEvent = (event: any) => spyTrackEvent(event);
        }
    }
    return { TelemetryClient };
});

const { ClientFactory } = await import('../../src/base/client/index.js');
const { EventName } = await import('../../src/base/types/event-name.js');
const { SampleRate } = await import('../../src/base/types/sample-rate.js');
const { TelemetrySettings } = await import('../../src/base/config-state.js');

describe('ClientFactory Send Report Tests', () => {
    beforeEach(() => {
        TelemetrySettings.telemetryEnabled = true;
    });
    afterEach(() => {
        TelemetrySettings.telemetryEnabled = true;
    });

    test('Test function getTelemetryClient()', async () => {
        const telemetryClient = ClientFactory.getTelemetryClient();

        const spy = jest.spyOn<any, any, any>(telemetryClient, 'trackEvent').mockImplementation(() => {
            return;
        });
        await telemetryClient.report(EventName.Test, {}, {}, SampleRate.NoSampling);
        expect((telemetryClient as any).trackEvent).toHaveBeenCalledTimes(1);
        spy.mockClear();
    });
});
