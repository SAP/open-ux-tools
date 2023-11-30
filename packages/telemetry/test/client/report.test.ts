import { ClientFactory } from '../../src/base/client';
import { EventName } from '../../src/base/types/event-name';
import { SampleRate } from '../../src/base/types/sample-rate';
import type { EventTelemetry } from 'applicationinsights/out/Declarations/Contracts';
import { TelemetrySettings } from '../../src/base/config-state';

const spyTrackEvent = jest.fn();

jest.mock('applicationinsights', () => {
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
            this.trackEvent = (event: EventTelemetry) => spyTrackEvent(event);
        }
    }
    return { TelemetryClient };
});

describe('ClientFactory Send Report Tests', () => {
    beforeEach(() => {
        TelemetrySettings.telemetryEnabled = true;
    });
    afterEach(() => {
        TelemetrySettings.telemetryEnabled = true;
    });

    test('Test function getTelemetryClient()', async () => {
        const telemetryClient = ClientFactory.getTelemetryClient();

        const spy = jest.spyOn<any, any>(telemetryClient, 'trackEvent').mockImplementation(() => {
            return;
        });
        await telemetryClient.report(EventName.Test, {}, {}, SampleRate.NoSampling);
        expect((telemetryClient as any).trackEvent).toBeCalledTimes(1);
        spy.mockClear();
    });
});
