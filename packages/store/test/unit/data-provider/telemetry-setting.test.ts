import { jest } from '@jest/globals';

const mockFsStore = {
    write: jest.fn(),
    read: jest.fn(),
    del: jest.fn(),
    getAll: jest.fn(),
    readAll: jest.fn(),
    partialUpdate: jest.fn()
};

jest.unstable_mockModule('../../../src/data-access/filesystem', () => ({
    getFilesystemStore: jest.fn().mockReturnValue(mockFsStore),
    basedir: jest.fn(),
    getFilesystemWatcherFor: jest.fn()
}));

const { TelemetryDataProvider } = await import('../../../src/data-provider/telemetry-setting');
const { Entities } = await import('../../../src/data-provider/constants');
const { TelemetrySetting, TelemetrySettingKey } = await import('../../../src');
const { NullTransport, ToolsLogger } = await import('@sap-ux/logger');

describe('TelemetrySetting data provider', () => {
    const logger = new ToolsLogger({ transports: [new NullTransport()] });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('read delegates to the data accessor', async () => {
        const expectedTelemetrySetting = {
            enableTelemetry: true
        };
        mockFsStore.read.mockResolvedValueOnce(expectedTelemetrySetting);
        await expect(new TelemetryDataProvider(logger).read(new TelemetrySettingKey())).resolves.toBe(
            expectedTelemetrySetting
        );
    });

    it('write delegates to the data accessor', async () => {
        const expectedTelemetrySetting = {
            enableTelemetry: true
        };
        mockFsStore.write.mockResolvedValueOnce(expectedTelemetrySetting);
        await expect(
            new TelemetryDataProvider(logger).write(new TelemetrySetting(expectedTelemetrySetting))
        ).resolves.toBe(expectedTelemetrySetting);
        expect(mockFsStore.write).toHaveBeenCalledWith({
            entityName: Entities.TelemetrySetting,
            id: new TelemetrySettingKey().getId(),
            entity: expectedTelemetrySetting
        });
    });

    it('delete delegates to the data accessor', async () => {
        const expectedTelemetrySetting = {
            enableTelemetry: true
        };
        mockFsStore.del.mockResolvedValueOnce(expectedTelemetrySetting);
        await expect(
            new TelemetryDataProvider(logger).delete(new TelemetrySetting(expectedTelemetrySetting))
        ).resolves.toBe(expectedTelemetrySetting);
        expect(mockFsStore.del).toHaveBeenCalledWith({
            entityName: Entities.TelemetrySetting,
            id: new TelemetrySettingKey().getId()
        });
    });

    it('getAll delegates to the data accessor', async () => {
        const expectedTelemetrySetting = {
            enableTelemetry: true
        };
        mockFsStore.getAll.mockResolvedValueOnce(expectedTelemetrySetting);
        await expect(new TelemetryDataProvider(logger).getAll()).resolves.toBe(expectedTelemetrySetting);
        expect(mockFsStore.getAll).toHaveBeenCalledWith({
            entityName: Entities.TelemetrySetting
        });
    });
});
