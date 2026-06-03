import { jest } from '@jest/globals';

const spyTrackEvent = jest.fn();

jest.unstable_mockModule('applicationinsights', () => {
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
            this.trackEvent = (event: any) => spyTrackEvent(event);
        }
    }
    return { TelemetryClient };
});

const { ClientFactory } = await import('../../src/base/client');
const { TelemetrySettings } = await import('../../src/base/config-state');
const { EventName } = await import('../../src/base/types/event-name');

describe('ClientFactory Send Report Default Sample Rate', () => {
    beforeEach(() => {
        TelemetrySettings.telemetryEnabled = true;
    });

    it('Test function getTelemetryClient()', async () => {
        process.env.SAP_UX_FIORI_TOOLS_DISABLE_TELEMETRY = 'false';
        const telemetryClient = ClientFactory.getTelemetryClient();
        await telemetryClient.report(EventName.Test, {}, {}, undefined);
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
                'cmn.nodeVersion': expect.any(String),
                'cmn.ideType': expect.any(String)
            }
        });
        delete process.env.SAP_UX_FIORI_TOOLS_DISABLE_TELEMETRY;
    });

    it('Test function getTelemetryClient() - disabled', async () => {
        process.env.SAP_UX_FIORI_TOOLS_DISABLE_TELEMETRY = 'true';

        const telemetryClient = ClientFactory.getTelemetryClient();
        await telemetryClient.report(EventName.Test, {}, {}, undefined);
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
                'cmn.nodeVersion': expect.any(String),
                'cmn.ideType': expect.any(String)
            }
        });

        delete process.env.SAP_UX_FIORI_TOOLS_DISABLE_TELEMETRY;
    });
});
