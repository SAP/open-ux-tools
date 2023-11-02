import * as interceptors from './index';

export enum interceptorTypes {
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
interceptorTypesMapping.set(interceptorTypes.NOTIFICATION, interceptors.notify);
interceptorTypesMapping.set(interceptorTypes.DURATION, interceptors.duration);
interceptorTypesMapping.set(interceptorTypes.CAPTURE_PARAM, interceptors.captureParam);

const asyncInterceptorTypesMapping = new Map();
asyncInterceptorTypesMapping.set(interceptorTypes.NOTIFICATION, interceptors.notifyAsync);
asyncInterceptorTypesMapping.set(interceptorTypes.DURATION, interceptors.durationAsync);
asyncInterceptorTypesMapping.set(interceptorTypes.CAPTURE_PARAM, interceptors.captureParamAsync);

export { interceptorTypesMapping, asyncInterceptorTypesMapping };
