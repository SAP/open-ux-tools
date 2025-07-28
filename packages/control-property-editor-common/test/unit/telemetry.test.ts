import { reportTelemetry, enableTelemetry, disableTelemetry } from '../../src/telemetry';

export const fetchMock = jest.fn().mockResolvedValue({ status: 200 });
window.fetch = fetchMock;

describe('reportTelemetry', () => {
    const testEvent = { category: 'test', propertyName: 'testProperty' };

    beforeEach(() => {
        fetchMock.mockClear();
    });

    test('enabled - data send', async () => {
        enableTelemetry();
        await reportTelemetry(testEvent);
        expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual(testEvent);
    });

    test('disabled - no data send', async () => {
        disableTelemetry();
        await reportTelemetry(testEvent);
        await reportTelemetry(testEvent);
        expect(fetchMock).toHaveBeenCalledTimes(0);
    });

    test('error caught when sending telemetry data', async () => {
        fetchMock.mockRejectedValueOnce('error');
        enableTelemetry();
        try {
            await reportTelemetry(testEvent);
        } catch (error) {
            fail(error);
        }
    });
});
