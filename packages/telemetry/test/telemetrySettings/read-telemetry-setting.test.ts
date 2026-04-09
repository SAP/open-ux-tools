import { jest } from '@jest/globals';

const mockGetService = jest.fn();

jest.unstable_mockModule('applicationinsights', () => {
    class TelemetryClient {
        public config: any;
        public channel: any;
        public addTelemetryProcessor: any;
        public trackEvent: any;
        constructor() {
            this.config = { samplingPercentage: 0 };
            this.channel = { setUseDiskRetryCaching: jest.fn() };
            this.addTelemetryProcessor = jest.fn();
            this.trackEvent = jest.fn();
        }
    }
    return { TelemetryClient };
});

jest.unstable_mockModule('@sap-ux/btp-utils', () => ({
    isAppStudio: jest.fn().mockReturnValue(false)
}));

jest.unstable_mockModule('@sap-ux/store', () => ({
    getService: mockGetService,
    getFilesystemWatcherFor: jest.fn(),
    Entity: { TelemetrySetting: 'telemetrySetting' },
    TelemetrySetting: class {
        enableTelemetry: boolean;
        constructor(opts: any) {
            this.enableTelemetry = opts?.enableTelemetry;
        }
    },
    TelemetrySettingKey: class {},
    Service: {}
}));

const { getTelemetrySetting } = await import('../../src/tooling-telemetry');

describe('Tests for getTelemetrySetting()', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('Telemetry setting should be enabled', async () => {
        // Mock setup
        mockGetService.mockResolvedValue({
            read: () => Promise.resolve({ enableTelemetry: true })
        });

        // Test execution
        const setting = await getTelemetrySetting();

        // Check results
        expect(setting?.enableTelemetry).toBe(true);
    });

    it('Telemetry setting should be disabled', async () => {
        // Mock setup
        mockGetService.mockResolvedValue({
            read: () => Promise.resolve({ enableTelemetry: false })
        });

        // Test execution
        const setting = await getTelemetrySetting();

        // Check results
        expect(setting?.enableTelemetry).toBe(false);
    });

    it('Telemetry setting should be undefined', async () => {
        // Mock setup
        mockGetService.mockResolvedValue({
            read: () => Promise.resolve(undefined)
        });

        // Test execution
        const setting = await getTelemetrySetting();

        // Check results
        expect(setting).toBe(undefined);
    });

    it('Error thrown while getTelemetrySetting() - should be undefined', async () => {
        // Mock setup
        mockGetService.mockResolvedValue({
            read: () => Promise.reject()
        });

        // Test execution
        const setting = await getTelemetrySetting();

        // Check results
        expect(setting).toBe(undefined);
    });
});
