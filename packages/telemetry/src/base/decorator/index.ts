import { interceptorTypesMapping, asyncInterceptorTypesMapping } from '../interceptor/config';
import type { SampleRate } from '../types/sample-rate';
import type { ParamRecordConfig } from '../utils/param-processing';

const decorCommon = (
    isAsync: boolean,
    target: Record<string, object>,
    descriptor: PropertyDescriptor,
    evtName: string,
    interceptorType: string,
    sampleRate: SampleRate,
    paramsCapturingInstructions: ParamRecordConfig | ParamRecordConfig[]
): void => {
    const originalMethod: Function = descriptor.value;
    const interceptorTypesMap = isAsync ? asyncInterceptorTypesMapping : interceptorTypesMapping;
    const interceptor: Function = interceptorTypesMap.get(interceptorType);
    descriptor.value = interceptor(target, originalMethod, evtName, sampleRate, paramsCapturingInstructions);
};

/**
 * Decorator used to log a telemetry event.
 *
 * @param evtName - Event names to filter data on backend, use EventNames predefined in Telemetry.EventName enumeration
 * @param interceptorType - Interceptor type to apply to decorated function, use interceptorTypes predefined in Telemetry.interceptorTypes enumeration
 * @param sampleRate - Sample rate for recorded data, use predefined sample rates in Telemetry.SampleRate enumeration
 * @param paramsCapturingInstructions - Optional param, Should be passed when interceptor of type CAPTURE_PARAM being used. As single instance or array of instances (when multiple params should be captured or some additional sumbission data should be predefined). Allows predefine property name, value or specify paths to value to be captured (if it's element of array or nested in object)
 * @returns function
 */
export const logTelemetry = (
    evtName: string,
    interceptorType: string,
    sampleRate: SampleRate,
    paramsCapturingInstructions: ParamRecordConfig | ParamRecordConfig[]
): Function => {
    return (target: Record<string, object>, functionName: string, descriptor: PropertyDescriptor): void => {
        decorCommon(false, target, descriptor, evtName, interceptorType, sampleRate, paramsCapturingInstructions);
    };
};

/**
 * Decorator to log telemetry asynchronously.
 *
 * @param evtName - Event names to filter data on backend, use EventNames predefined in Telemetry.EventName enumeration
 * @param interceptorType - Interceptor type to apply to decorated function, use interceptorTypes predefined in Telemetry.interceptorTypes enumeration
 * @param sampleRate - Sample rate for recorded data, use predefined sample rates in Telemetry.SampleRate enumeration
 * @param paramsCapturingInstructions - Optional param, Should be passed when interceptor of type CAPTURE_PARAM being used. As single instance or array of instances (when multiple params should be captured or some additional sumbission data should be predefined). Allows predefine property name, value or specify paths to value to be captured (if it's element of array or nested in object)
 * @returns function
 */
export const logTelemetryAsync = (
    evtName: string,
    interceptorType: string,
    sampleRate: SampleRate,
    paramsCapturingInstructions: ParamRecordConfig | ParamRecordConfig[]
): Function => {
    return (target: Record<string, object>, functionName: string, descriptor: PropertyDescriptor): void => {
        decorCommon(true, target, descriptor, evtName, interceptorType, sampleRate, paramsCapturingInstructions);
    };
};
