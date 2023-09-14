import { reportTelemetry, reset } from '../../src/telemetry';

export const fetchMock = jest.fn().mockResolvedValue({ status: 200 });
window.fetch = fetchMock;

describe('reportTelemetry', () => {
    beforeEach(() => {
        fetchMock.mockClear();
        reset();
    });

    test('service available - data send', async () => {
        await reportTelemetry({ category: 'test', propertyName: 'testProperty' });
        await reportTelemetry({ category: 'test', propertyName: 'testProperty2' });
        expect(fetchMock).toBeCalledTimes(3);
    });

    test('service not available - no data send', async () => {
        fetchMock.mockResolvedValueOnce({ status: 404 });
        await reportTelemetry({ category: 'test', propertyName: 'testProperty' });
        await reportTelemetry({ category: 'test', propertyName: 'testProperty2' });
        await reportTelemetry({ category: 'test', propertyName: 'testProperty3' });
        expect(fetchMock).toBeCalledTimes(1);
    });

    test('error caught when sending telemetry data', async () => {
        fetchMock.mockResolvedValueOnce({ status: 200 });
        fetchMock.mockRejectedValueOnce('error');
        try {
            await reportTelemetry({ category: 'test', propertyName: 'testProperty' });
        } catch (error) {
            fail(error);
        }
    });
});
