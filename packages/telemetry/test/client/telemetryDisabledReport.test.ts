import { ClientFactory } from '../../src/client';
import { TelemetrySystem } from '../../src/system/system';
import { EventName } from '../../src/client/model/EventName';
import { SampleRate } from '../../src/client/model/SampleRate';
import { EventTelemetry } from 'applicationinsights/out/Declarations/Contracts';

const spyTrackEvent: jest.Mock = jest.fn();

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
        TelemetrySystem.telemetryEnabled = false;
        TelemetrySystem.WORKSTREAM = 'extension';
    });
    afterEach(() => {
        TelemetrySystem.telemetryEnabled = undefined;
    });

    test('Test function getTelemetryClient()', () => {
        const telemetryClient = ClientFactory.getTelemetryClient();

        const spy = jest.spyOn<any, any>(telemetryClient, 'trackEvent').mockImplementation((): void => {
            return;
        });
        telemetryClient.report(EventName.Test, {}, {}, SampleRate.NoSampling);
        expect((telemetryClient as any).trackEvent).toBeCalledTimes(0);
        spy.mockClear();
    });
});
