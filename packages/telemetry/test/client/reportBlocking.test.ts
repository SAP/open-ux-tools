import { ClientFactory } from '../../src/client';
import { TelemetrySystem } from '../../src/system/system';
import { EventName } from '../../src/client/model/EventName';
import { SampleRate } from '../../src/client/model/SampleRate';
import { EventTelemetry } from 'applicationinsights/out/Declarations/Contracts';
import FlushOptions from 'applicationinsights/out/Library/FlushOptions';

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
                options && options.callback && options.callback('testCallbackValue');
            };
        }
    }
    return { TelemetryClient };
});

describe('ClientFactory Send Report Blocking Tests', () => {
    beforeEach(() => {
        TelemetrySystem.telemetryEnabled = true;
    });
    afterEach(() => {
        TelemetrySystem.telemetryEnabled = false;
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
                eventName: EventName.SERVICE_INQUIRER_BAS_SUCCESS,
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
                eventName: EventName.SERVICE_INQUIRER_BAS_ERROR,
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
