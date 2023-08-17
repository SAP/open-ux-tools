import { reportTelemetry } from '../../src/telemetry';

describe('reportTelemetry', () => {
    afterEach(() => {
        global.fetch = jest.fn(() => Promise.resolve({}));
    });
    test('control not found by id, search by component', () => {
        global.fetch = jest.fn().mockImplementation().mockResolvedValueOnce('success');
        reportTelemetry({ eventType: 'test', propertyName: 'testProperty' });

        expect(global.fetch).toBeCalledTimes(1);
    });
    test('error in sending telemetry', () => {
        global.fetch = jest.fn().mockImplementation().mockRejectedValueOnce('error');
        reportTelemetry({ eventType: 'test', propertyName: 'testProperty' });

        expect(global.fetch).toBeCalledTimes(1);
    });
});
