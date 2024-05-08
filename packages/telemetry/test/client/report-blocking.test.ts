import { ClientFactory } from '../../src/base/client';
import { TelemetrySettings } from '../../src/base/config-state';
import { EventName } from '../../src/base/types/event-name';
import { SampleRate } from '../../src/base/types/sample-rate';
import type { EventTelemetry } from 'applicationinsights/out/Declarations/Contracts';
import type FlushOptions from 'applicationinsights/out/Library/FlushOptions';

const trackEventMock = jest.fn();
const flushMock = jest.fn();

jest.mock('applicationinsights', () => {
    class TelemetryClient {
        public config: any;
        public channel: any;
        public addTelemetryProcessor: any;
        public trackEvent: any;
        public flush: any;

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
            this.trackEvent = (event: EventTelemetry) => trackEventMock(event);
            this.flush = (options: FlushOptions | undefined) => {
                flushMock(options);
                if (options?.callback) {
                    options.callback('testCallbackValue');
                }
            };
        }
    }
    return { TelemetryClient };
});

describe('ClientFactory Send Report Blocking Tests', () => {
    beforeEach(() => {
        TelemetrySettings.telemetryEnabled = true;
    });
    afterEach(() => {
        TelemetrySettings.telemetryEnabled = false;
    });

    it('reportEvent - success', async () => {
        const telemetryClient = ClientFactory.getTelemetryClient();

        const telemetryClientWrapperTrackEventMock = jest
            .spyOn<any, any>(telemetryClient, 'trackEvent')
            .mockImplementation(() => {
                return;
            });
        await telemetryClient.reportEvent(
            {
                eventName: EventName.Test,
                properties: {},
                measurements: {}
            },
            SampleRate.NoSampling
        );
        expect(telemetryClientWrapperTrackEventMock).toBeCalledTimes(1);
        expect(flushMock).toBeCalledTimes(0);
        telemetryClientWrapperTrackEventMock.mockClear();
    });

    it('reportEvent - error', async () => {
        const telemetryClient = ClientFactory.getTelemetryClient();

        const telemetryClientWrapperTrackEventMock = jest
            .spyOn<any, any>(telemetryClient, 'trackEvent')
            .mockImplementation(() => {
                return;
            });
        await telemetryClient.reportEventBlocking(
            {
                eventName: EventName.Test,
                properties: {},
                measurements: {}
            },
            SampleRate.NoSampling
        );
        expect(trackEventMock).toBeCalledTimes(1);
        expect(flushMock).toBeCalledTimes(1);
        telemetryClientWrapperTrackEventMock.mockClear();
    });
});
