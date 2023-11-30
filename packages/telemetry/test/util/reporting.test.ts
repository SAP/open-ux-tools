import { reportRuntimeError, reportEnableTelemetryOnOff } from '../../src/base/utils/reporting';
import { EventName } from '../../src';
import type { EventTelemetry } from 'applicationinsights/out/Declarations/Contracts';

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

let telemetrySetting: string | undefined;

describe('Error reporting', () => {
    beforeAll(() => {
        telemetrySetting = process.env.SAP_UX_FIORI_TOOLS_DISABLE_TELEMETRY;
    });
    afterAll(() => {
        if (telemetrySetting) {
            process.env.SAP_UX_FIORI_TOOLS_DISABLE_TELEMETRY = telemetrySetting;
        } else {
            delete process.env.SAP_UX_FIORI_TOOLS_DISABLE_TELEMETRY;
        }
    });

    beforeEach(() => {
        spyTrackEvent.mockClear();
        delete process.env.SAP_UX_FIORI_TOOLS_DISABLE_TELEMETRY;
    });
    afterEach(() => {
        delete process.env.SAP_UX_FIORI_TOOLS_DISABLE_TELEMETRY;
    });

    it('Test errorReporting', () => {
        process.env.SAP_UX_FIORI_TOOLS_DISABLE_TELEMETRY = 'false';
        const error = new Error();
        reportRuntimeError(error);
        expect(spyTrackEvent).toHaveBeenCalledWith({
            measurements: {},
            name: EventName.TELEMETRY_SETTINGS_INIT_FAILED,
            properties: {
                message: '',
                stack: expect.stringContaining('reporting.test.ts')
            }
        });
    });

    it('Test errorReporting - Disabled by env var', () => {
        process.env.SAP_UX_FIORI_TOOLS_DISABLE_TELEMETRY = 'true';
        const error = new Error();
        reportRuntimeError(error);
        expect(spyTrackEvent).toHaveBeenCalledTimes(0);
    });

    it('Test reporting turn off telemetry', () => {
        process.env.SAP_UX_FIORI_TOOLS_DISABLE_TELEMETRY = 'false';
        reportEnableTelemetryOnOff(false, { isAppStudio: 'true' });
        expect(spyTrackEvent).toHaveBeenCalledWith({
            measurements: {},
            name: EventName.DISABLE_TELEMETRY,
            properties: {
                disableTelemetry: 'true',
                isAppStudio: 'true'
            }
        });
    });

    it('Test reporting turn off telemetry - Disabled by env var', () => {
        process.env.SAP_UX_FIORI_TOOLS_DISABLE_TELEMETRY = 'true';
        reportEnableTelemetryOnOff(false, {});
        expect(spyTrackEvent).toHaveBeenCalledTimes(0);
    });

    it('Test without stack trace', () => {
        process.env.SAP_UX_FIORI_TOOLS_DISABLE_TELEMETRY = 'false';
        const error = new Error();
        error.stack = undefined;
        reportRuntimeError(error);
        expect(spyTrackEvent).toHaveBeenCalledWith({
            measurements: {},
            name: EventName.TELEMETRY_SETTINGS_INIT_FAILED,
            properties: { message: '' }
        });
    });

    it('Test with dummy stack trace', () => {
        process.env.SAP_UX_FIORI_TOOLS_DISABLE_TELEMETRY = 'false';
        const error = new Error();
        error.stack = 'test stack trace';
        reportRuntimeError(error);
        expect(spyTrackEvent).toHaveBeenCalledWith({
            measurements: {},
            name: EventName.TELEMETRY_SETTINGS_INIT_FAILED,
            properties: { message: '' }
        });
    });
});
