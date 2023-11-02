import { logTelemetry, logTelemetryAsync } from '../../src/decorator';
import { EventName, interceptorTypes, SampleRate, ParamRecordConfig } from '../../src';
import { ClientFactory } from '../../src/client';
import { promisify } from 'util';

describe('Decorator Tests', () => {
    const timeOut = promisify(setTimeout);
    const mockInput = 'MockTitle';

    let spy: jest.SpyInstance;
    let reportSpy: jest.SpyInstance;
    beforeEach(() => {
        reportSpy = jest.fn();

        spy = jest.spyOn(ClientFactory, 'getTelemetryClient').mockImplementation(() => {
            return {
                report: reportSpy
            } as any;
        });
    });

    afterEach(() => {
        spy.mockClear();
    });

    describe('Test CAPTURE_PARAM', () => {
        const paramConfig = [
            new ParamRecordConfig('action', 'applied'),
            new ParamRecordConfig('guideName', undefined, 0)
        ];
        test('Test CAPTURE_PARAM Sync', () => {
            const interceptFn: Function = logTelemetry(
                EventName.Test,
                interceptorTypes.CAPTURE_PARAM,
                SampleRate.NoSampling,
                paramConfig
            );

            const mockOriginalFn = (title: string): string => {
                return title;
            };
            const mockDescriptor = {
                value: mockOriginalFn
            };
            interceptFn(null, 'mockOriginalFn', mockDescriptor);
            const output = mockDescriptor.value(mockInput);

            expect(spy).toBeCalledTimes(1);
            expect(reportSpy).toHaveBeenCalledWith(
                EventName.Test,
                { action: 'applied', guideName: mockInput },
                {},
                SampleRate.NoSampling
            );
            expect(output).toEqual(mockInput);
        });

        test('Test CAPTURE_PARAM Async', async () => {
            const interceptFn: Function = logTelemetryAsync(
                EventName.Test,
                interceptorTypes.CAPTURE_PARAM,
                SampleRate.NoSampling,
                paramConfig
            );

            const mockOriginalFn = async (title: string): Promise<string> => {
                await timeOut(1);
                return title;
            };
            const mockDescriptor = {
                value: mockOriginalFn
            };
            interceptFn(null, 'mockOriginalFn', mockDescriptor);

            const output = await mockDescriptor.value(mockInput);
            expect(spy).toBeCalledTimes(1);
            expect(reportSpy).toHaveBeenCalledWith(
                EventName.Test,
                { action: 'applied', guideName: mockInput },
                {},
                SampleRate.NoSampling
            );
            expect(output).toEqual(mockInput);
        });
    });

    describe('Test DURATION', () => {
        test('Test DURATION Sync', () => {
            const interceptFn: Function = logTelemetry(
                EventName.Test,
                interceptorTypes.DURATION,
                SampleRate.NoSampling,
                []
            );

            const mockOriginalFn = (title: string): string => {
                return title;
            };
            const mockDescriptor = {
                value: mockOriginalFn
            };
            interceptFn(null, 'mockOriginalFn', mockDescriptor);
            const output = mockDescriptor.value(mockInput);

            expect(spy).toBeCalledTimes(1);
            expect(reportSpy).toHaveBeenCalledWith(
                EventName.Test,
                {},
                { ms: expect.anything() },
                SampleRate.NoSampling
            );
            expect(output).toEqual(mockInput);
        });

        test('Test DURATION Async', async () => {
            const interceptFn: Function = logTelemetryAsync(
                EventName.Test,
                interceptorTypes.DURATION,
                SampleRate.NoSampling,
                []
            );

            const mockOriginalFn = async (title: string): Promise<string> => {
                await timeOut(1);
                return title;
            };
            const mockDescriptor = {
                value: mockOriginalFn
            };
            interceptFn(null, 'mockOriginalFn', mockDescriptor);

            const output = await mockDescriptor.value(mockInput);
            expect(spy).toBeCalledTimes(1);
            expect(reportSpy).toHaveBeenCalledWith(
                EventName.Test,
                {},
                { ms: expect.anything() },
                SampleRate.NoSampling
            );
            expect(output).toEqual(mockInput);
        });
    });

    describe('Test NOTIFICATION', () => {
        test('Test NOTIFICATION Sync', () => {
            const interceptFn: Function = logTelemetry(
                EventName.Test,
                interceptorTypes.NOTIFICATION,
                SampleRate.NoSampling,
                []
            );

            const mockOriginalFn = (title: string): string => {
                return title;
            };
            const mockDescriptor = {
                value: mockOriginalFn
            };
            interceptFn(null, 'mockOriginalFn', mockDescriptor);
            const output = mockDescriptor.value(mockInput);

            expect(spy).toBeCalledTimes(1);
            expect(reportSpy).toHaveBeenCalledWith(EventName.Test, {}, {}, SampleRate.NoSampling);
            expect(output).toEqual(mockInput);
        });

        test('Test NOTIFICATION Async', async () => {
            const interceptFn: Function = logTelemetryAsync(
                EventName.Test,
                interceptorTypes.NOTIFICATION,
                SampleRate.NoSampling,
                []
            );

            const mockOriginalFn = async (title: string): Promise<string> => {
                await timeOut(1);
                return title;
            };
            const mockDescriptor = {
                value: mockOriginalFn
            };
            interceptFn(null, 'mockOriginalFn', mockDescriptor);

            const output = await mockDescriptor.value(mockInput);
            expect(spy).toBeCalledTimes(1);
            expect(reportSpy).toHaveBeenCalledWith(EventName.Test, {}, {}, SampleRate.NoSampling);
            expect(output).toEqual(mockInput);
        });
    });
});
