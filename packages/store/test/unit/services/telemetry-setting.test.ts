import { getInstance } from '../../../src/services/telemetry-setting';
import { TelemetrySetting, TelemetrySettingKey } from '../../../src';
import { TelemetryDataProvider } from '../../../src/data-provider/telemetry-setting';
import { ToolsLogger, NullTransport } from '@sap-ux/logger';

jest.mock('../../../src/data-provider/telemetry-setting');

describe('TelemetrySetting service', () => {
    beforeEach(() => {
        jest.resetAllMocks();
    });

    const logger = new ToolsLogger({ transports: [new NullTransport()] });

    describe('delete', () => {
        it('delegates to data provider', async () => {
            const mockDataProvider = jest.spyOn(TelemetryDataProvider.prototype, 'delete');
            const service = getInstance(logger);
            await service.delete(new TelemetrySetting({ enableTelemetry: true }));
            expect(mockDataProvider).toHaveBeenCalledTimes(1);
        });
    });

    describe('partialUpdate', () => {
        it('partial update not implemented', async () => {
            await expect(getInstance(logger).partialUpdate()).rejects.toThrow('NOT IMPLEMENTED');
        });
    });

    describe('getAll', () => {
        it('delegates to data provider', async () => {
            const mockDataProvider = jest.spyOn(TelemetryDataProvider.prototype, 'getAll');
            const service = getInstance(logger);
            await service.getAll();
            expect(mockDataProvider).toHaveBeenCalledTimes(1);
        });
    });

    describe('read', () => {
        it('delegates to data provider', async () => {
            const mockDataProvider = jest.spyOn(TelemetryDataProvider.prototype, 'read');
            const service = getInstance(logger);
            await service.read(new TelemetrySettingKey());
            expect(mockDataProvider).toHaveBeenCalledTimes(1);
        });
    });

    describe('write', () => {
        it('delegates to data provider', async () => {
            const mockDataProvider = jest.spyOn(TelemetryDataProvider.prototype, 'write');
            const service = getInstance(logger);
            await service.write(new TelemetrySetting({ enableTelemetry: true }));
            expect(mockDataProvider).toHaveBeenCalledTimes(1);
        });
    });
});
