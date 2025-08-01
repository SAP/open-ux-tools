import { TelemetrySetting, TelemetrySettingKey } from '../../../src';
import * as dataAccessFilesystem from '../../../src/data-access/filesystem';
import { TelemetryDataProvider } from '../../../src/data-provider/telemetry-setting';
import { Entities } from '../../../src/data-provider/constants';
import { NullTransport, ToolsLogger } from '@sap-ux/logger';

describe('TelemetrySetting data provider', () => {
    const logger = new ToolsLogger({ transports: [new NullTransport()] });
    const mockGetFilesystemStore = jest.spyOn(dataAccessFilesystem, 'getFilesystemStore');
    const mockFsStore = {
        write: jest.fn(),
        read: jest.fn(),
        del: jest.fn(),
        getAll: jest.fn(),
        readAll: jest.fn(),
        partialUpdate: jest.fn()
    };
    beforeEach(() => {
        mockGetFilesystemStore.mockReturnValue(mockFsStore);
    });

    it('read delegates to the data accessor', async () => {
        const expectedTelemetrySetting: TelemetrySetting = {
            enableTelemetry: true
        };
        mockFsStore.read.mockResolvedValueOnce(expectedTelemetrySetting);
        await expect(new TelemetryDataProvider(logger).read(new TelemetrySettingKey())).resolves.toBe(
            expectedTelemetrySetting
        );
    });

    it('write delegates to the data accessor', async () => {
        const expectedTelemetrySetting: TelemetrySetting = {
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
        const expectedTelemetrySetting: TelemetrySetting = {
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
        const expectedTelemetrySetting: TelemetrySetting = {
            enableTelemetry: true
        };
        mockFsStore.getAll.mockResolvedValueOnce(expectedTelemetrySetting);
        await expect(new TelemetryDataProvider(logger).getAll()).resolves.toBe(expectedTelemetrySetting);
        expect(mockFsStore.getAll).toHaveBeenCalledWith({
            entityName: Entities.TelemetrySetting
        });
    });
});
