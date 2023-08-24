import { reportTelemetry } from '../../src/telemetry';
const globalAny: any = global;
describe('reportTelemetry', () => {
    afterEach(() => {
        globalAny.fetch = jest.fn(() => Promise.resolve({}));
    });
    test('control not found by id, search by component', () => {
        globalAny.fetch = jest.fn().mockImplementation().mockResolvedValueOnce('success');
        reportTelemetry({ category: 'test', propertyName: 'testProperty' });

        expect(globalAny.fetch).toBeCalledTimes(1);
    });
    test('error in sending telemetry', () => {
        globalAny.fetch = jest.fn().mockImplementation().mockRejectedValueOnce('error');
        reportTelemetry({ category: 'test', propertyName: 'testProperty' });

        expect(globalAny.fetch).toBeCalledTimes(1);
    });
});
