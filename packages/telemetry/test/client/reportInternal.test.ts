import { ClientFactory } from '../../src/client';
import { TelemetrySystem } from '../../src/system/system';
import { EventName } from '../../src/client/model/EventName';
import { SampleRate } from '../../src/client/model/SampleRate';

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
            this.trackEvent = (...args) => spyTrackEvent(...args);
        }
    }
    return { TelemetryClient };
});

describe('ClientFactory Send Report Internal Extension', () => {
    beforeEach(() => {
        TelemetrySystem.telemetryEnabled = true;
        TelemetrySystem.WORKSTREAM = 'extension';
    });
    afterEach(() => {
        TelemetrySystem.telemetryEnabled = undefined;
    });

    test('Test function getTelemetryClient()', async () => {
        const previousSetting = process.env.SAP_UX_FIORI_TOOLS_DISABLE_TELEMETRY;
        try {
            process.env.SAP_UX_FIORI_TOOLS_DISABLE_TELEMETRY = 'false';

            const telemetryClient = ClientFactory.getTelemetryClient();
            await telemetryClient.report(EventName.Test, {}, {}, SampleRate.NoSampling);
            expect(spyTrackEvent).toHaveBeenCalledTimes(1);
            expect(spyTrackEvent).toHaveBeenCalledWith({
                measurements: {},
                name: expect.stringContaining(EventName.Test),
                properties: {
                    appstudio: false,
                    datetime: expect.any(String),
                    internalVsExternal: 'external',
                    v: expect.any(String),
                    'cmn.appstudio': false,
                    'cmn.internalFeatures': 'external',
                    'cmn.devspace': '',
                    'cmn.nodeVersion': expect.any(String)
                }
            });
        } finally {
            if (previousSetting) {
                process.env.SAP_UX_FIORI_TOOLS_DISABLE_TELEMETRY = previousSetting;
            } else {
                delete process.env.SAP_UX_FIORI_TOOLS_DISABLE_TELEMETRY;
            }
        }
    });
});
