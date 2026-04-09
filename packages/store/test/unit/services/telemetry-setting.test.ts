import { jest } from '@jest/globals';

const mockDataProviderProto = {
    read: jest.fn(),
    write: jest.fn(),
    delete: jest.fn(),
    getAll: jest.fn()
};

jest.unstable_mockModule('../../../src/data-provider/telemetry-setting', () => ({
    TelemetryDataProvider: jest.fn().mockImplementation(() => mockDataProviderProto)
}));

const { getInstance } = await import('../../../src/services/telemetry-setting');
const { TelemetrySetting, TelemetrySettingKey } = await import('../../../src');
const { NullTransport, ToolsLogger } = await import('@sap-ux/logger');

describe('TelemetrySetting service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    const logger = new ToolsLogger({ transports: [new NullTransport()] });

    describe('delete', () => {
        it('delegates to data provider', async () => {
            const service = getInstance(logger);
            await service.delete(new TelemetrySetting({ enableTelemetry: true }));
            expect(mockDataProviderProto.delete).toHaveBeenCalledTimes(1);
        });
    });

    describe('partialUpdate', () => {
        it('partial update not implemented', async () => {
            await expect(getInstance(logger).partialUpdate()).rejects.toThrow('NOT IMPLEMENTED');
        });
    });

    describe('getAll', () => {
        it('delegates to data provider', async () => {
            const service = getInstance(logger);
            await service.getAll();
            expect(mockDataProviderProto.getAll).toHaveBeenCalledTimes(1);
        });
    });

    describe('read', () => {
        it('delegates to data provider', async () => {
            const service = getInstance(logger);
            await service.read(new TelemetrySettingKey());
            expect(mockDataProviderProto.read).toHaveBeenCalledTimes(1);
        });
    });

    describe('write', () => {
        it('delegates to data provider', async () => {
            const service = getInstance(logger);
            await service.write(new TelemetrySetting({ enableTelemetry: true }));
            expect(mockDataProviderProto.write).toHaveBeenCalledTimes(1);
        });
    });
});
