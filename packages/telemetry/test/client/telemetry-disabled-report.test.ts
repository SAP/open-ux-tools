import { ClientFactory } from '../../src/base/client';
import { TelemetrySettings } from '../../src/base/config-state';
import { EventName } from '../../src/base/types/event-name';
import { SampleRate } from '../../src/base/types/sample-rate';
import type { EventTelemetry } from 'applicationinsights/out/src/declarations/contracts';

const spyTrackEvent: jest.Mock = jest.fn();

jest.mock('applicationinsights', () => {
    class TelemetryClient {
        public config: any;
        public addTelemetryProcessor: any;
        public trackEvent: any;
        public setUseDiskRetryCaching: any;
        constructor() {
            this.config = {
                samplingPercentage: 0
            };
            this.setUseDiskRetryCaching = jest.fn();
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
        TelemetrySettings.telemetryEnabled = false;
    });
    afterEach(() => {
        TelemetrySettings.telemetryEnabled = true;
    });

    test('Test function getTelemetryClient()', async () => {
        const telemetryClient = ClientFactory.getTelemetryClient();

        const spy = jest.spyOn<any, any>(telemetryClient, 'trackEvent').mockImplementation((): void => {
            return;
        });
        await telemetryClient.report(EventName.Test, {}, {}, SampleRate.NoSampling);
        expect((telemetryClient as any).trackEvent).toHaveBeenCalledTimes(0);
        spy.mockClear();
    });
});
