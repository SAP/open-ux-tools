import { jest } from '@jest/globals';

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
const { EventName } = await import('../../src/base/types/event-name.js');
const { SampleRate } = await import('../../src/base/types/sample-rate.js');

describe('ClientFactory Send Report Tests', () => {
    beforeEach(() => {
        TelemetrySettings.telemetryEnabled = false;
    });
    afterEach(() => {
        TelemetrySettings.telemetryEnabled = true;
    });

    test('Test function getTelemetryClient()', async () => {
        const telemetryClient = ClientFactory.getTelemetryClient();

        const spy = jest.spyOn<any, any, any>(telemetryClient, 'trackEvent').mockImplementation((): void => {
            return;
        });
        await telemetryClient.report(EventName.Test, {}, {}, SampleRate.NoSampling);
        expect((telemetryClient as any).trackEvent).toHaveBeenCalledTimes(0);
        spy.mockClear();
    });
});
