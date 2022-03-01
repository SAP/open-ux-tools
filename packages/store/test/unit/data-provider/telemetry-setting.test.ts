import { TelemetrySetting, TelemetrySettingKey } from '../../../src';
import { FilesystemStore } from '../../../src/data-access/filesystem';
import { TelemetryDataProvider } from '../../../src/data-provider/telemetry-setting';
import { Entities } from '../../../src/data-provider/constants';
import { NullTransport, ToolsLogger } from '@sap-ux/logger';

describe('TelemetrySetting data provider', () => {
    const logger = new ToolsLogger({ transports: [new NullTransport()] });
    beforeEach(() => {
        jest.resetAllMocks();
    });

    it('read delegates to the data accessor', () => {
        const expectedTelemetrySetting: TelemetrySetting = {
            enableTelemetry: true
        };
        jest.spyOn(FilesystemStore.prototype, 'read').mockResolvedValueOnce(expectedTelemetrySetting);
        expect(new TelemetryDataProvider(logger).read(new TelemetrySettingKey())).resolves.toBe(
            expectedTelemetrySetting
        );
    });

    it('write delegates to the data accessor', () => {
        const expectedTelemetrySetting: TelemetrySetting = {
            enableTelemetry: true
        };
        const mockStore = jest
            .spyOn(FilesystemStore.prototype, 'write')
            .mockResolvedValueOnce(expectedTelemetrySetting);
        expect(new TelemetryDataProvider(logger).write(new TelemetrySetting(expectedTelemetrySetting))).resolves.toBe(
            expectedTelemetrySetting
        );
        expect(mockStore).toBeCalledWith({
            entityName: Entities.TelemetrySetting,
            id: new TelemetrySettingKey().getId(),
            entity: expectedTelemetrySetting
        });
    });

    it('delete delegates to the data accessor', () => {
        const expectedTelemetrySetting: TelemetrySetting = {
            enableTelemetry: true
        };
        const mockStore = jest.spyOn(FilesystemStore.prototype, 'del').mockResolvedValueOnce(expectedTelemetrySetting);
        expect(new TelemetryDataProvider(logger).delete(new TelemetrySetting(expectedTelemetrySetting))).resolves.toBe(
            expectedTelemetrySetting
        );
        expect(mockStore).toBeCalledWith({
            entityName: Entities.TelemetrySetting,
            id: new TelemetrySettingKey().getId()
        });
    });

    it('getAll delegates to the data accessor', async () => {
        const expectedTelemetrySetting: TelemetrySetting = {
            enableTelemetry: true
        };
        const mockStore = jest
            .spyOn(FilesystemStore.prototype, 'getAll')
            .mockResolvedValueOnce(expectedTelemetrySetting);
        expect(new TelemetryDataProvider(logger).getAll()).resolves.toBe(expectedTelemetrySetting);
        expect(mockStore).toBeCalledWith({
            entityName: Entities.TelemetrySetting
        });
    });
});
