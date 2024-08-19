import * as interceptors from './index';

export enum InterceptorTypes {
    /**
     * Simple notification interceptor, reports certain event
     * occurance and requires no data to be captured or measured.
     */
    NOTIFICATION = 'notify',

    /**
     * Duration interceptor, measures and reports runtime of decorated method.
     */
    DURATION = 'duration',

    /**
     * Captures specified in paramCaptureConfig parameter of decorated method.
     */
    CAPTURE_PARAM = 'captureParam'
}

const interceptorTypesMapping = new Map();
interceptorTypesMapping.set(InterceptorTypes.NOTIFICATION, interceptors.notify);
interceptorTypesMapping.set(InterceptorTypes.DURATION, interceptors.duration);
interceptorTypesMapping.set(InterceptorTypes.CAPTURE_PARAM, interceptors.captureParam);

const asyncInterceptorTypesMapping = new Map();
asyncInterceptorTypesMapping.set(InterceptorTypes.NOTIFICATION, interceptors.notifyAsync);
asyncInterceptorTypesMapping.set(InterceptorTypes.DURATION, interceptors.durationAsync);
asyncInterceptorTypesMapping.set(InterceptorTypes.CAPTURE_PARAM, interceptors.captureParamAsync);

export { interceptorTypesMapping, asyncInterceptorTypesMapping };
