import { jest } from '@jest/globals';

const trackEventMock = jest.fn();
const flushMock = jest.fn();

jest.unstable_mockModule('applicationinsights', () => {
    class TelemetryClient {
        public config: any;
        public context: any;
        public setUseDiskRetryCaching: any;
        public trackEvent: any;
        public flush: any;

        constructor() {
            this.config = {
                samplingPercentage: 0
            };
            this.context = { tags: {} };
            this.setUseDiskRetryCaching = jest.fn();
            this.trackEvent = (event: any) => trackEventMock(event);
            this.flush = (options: any) => {
                flushMock(options);
                if (options?.callback) {
                    options.callback('testCallbackValue');
                }
            };
        }
    }
    return { TelemetryClient };
});

const { ClientFactory } = await import('../../src/base/client/index.js');
const { TelemetrySettings } = await import('../../src/base/config-state.js');
const { EventName } = await import('../../src/base/types/event-name.js');
const { SampleRate } = await import('../../src/base/types/sample-rate.js');

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
            .spyOn<any, any, any>(telemetryClient, 'trackEvent')
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
        expect(telemetryClientWrapperTrackEventMock).toHaveBeenCalledTimes(1);
        expect(flushMock).toHaveBeenCalledTimes(0);
        telemetryClientWrapperTrackEventMock.mockClear();
    });

    it('reportEvent - error', async () => {
        const telemetryClient = ClientFactory.getTelemetryClient();

        const telemetryClientWrapperTrackEventMock = jest
            .spyOn<any, any, any>(telemetryClient, 'trackEvent')
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
        expect(trackEventMock).toHaveBeenCalledTimes(1);
        expect(flushMock).toHaveBeenCalledTimes(1);
        telemetryClientWrapperTrackEventMock.mockClear();
    });

    it('reportEventBlocking - does not send or flush if telemetry is disabled', async () => {
        TelemetrySettings.telemetryEnabled = false;
        trackEventMock.mockClear();
        flushMock.mockClear();

        await ClientFactory.getTelemetryClient().reportEventBlocking(
            { eventName: EventName.Test, properties: {}, measurements: {} },
            SampleRate.NoSampling
        );

        expect(trackEventMock).not.toHaveBeenCalled();
        expect(flushMock).not.toHaveBeenCalled();
    });

    it('reportBlocking - does not send if telemetry is disabled, also when ignoreSettings is set', async () => {
        TelemetrySettings.telemetryEnabled = false;
        trackEventMock.mockClear();
        flushMock.mockClear();
        const telemetryClient = ClientFactory.getTelemetryClient();

        await telemetryClient.reportBlocking(EventName.Test, {}, {}, SampleRate.NoSampling);
        await telemetryClient.reportBlocking(EventName.Test, {}, {}, SampleRate.NoSampling, true);

        expect(trackEventMock).not.toHaveBeenCalled();
        expect(flushMock).not.toHaveBeenCalled();
    });
});
