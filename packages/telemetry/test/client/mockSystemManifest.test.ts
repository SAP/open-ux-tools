import { ClientFactory } from '../../src/client';
import type { Client } from '../../src/client/client';
import { TelemetrySystem } from '../../src/system/system';

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
            this.trackEvent = (...args) => spyTrackEvent(args);
        }
    }
    return { TelemetryClient };
});

describe('ClientFactory Tests with Mock System.manifest', () => {
    const mockName = 'mockName';
    const mockVersion = 'mockVersion';

    beforeEach(() => {
        TelemetrySystem.manifest = {
            name: mockName,
            version: mockVersion
        };
    });

    afterEach(() => {
        (TelemetrySystem.manifest as any) = undefined;
    });

    test('Test function getTelemetryClient()', () => {
        const telemetryClient: Client = ClientFactory.getTelemetryClient();

        const extensionName = telemetryClient.getExtensionName();
        const extensionVersion = telemetryClient.getExtensionVersion();
        expect(extensionName).toEqual(mockName);
        expect(extensionVersion).toEqual(mockVersion);
    });
});
