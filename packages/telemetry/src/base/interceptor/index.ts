import type { EventName } from '../types/event-name.js';
import type { SampleRate } from '../types/sample-rate.js';
import { ClientFactory } from '../client/index.js';
import type { Client } from '../client/client.js';
import { PerformanceMeasurementAPI as performance } from '../performance/api.js';
import type { ParamRecordConfig } from '../utils/param-processing.js';
import { getParamsData } from '../utils/param-processing.js';

export const notify = (
    target: Record<string, object>,
    originalFn: Function,
    evtName: EventName,
    sampleRate: SampleRate
): Function => {
    return (...args: []): Function => {
        const result = originalFn.apply(target, args);
        const appinsightClient: Client = ClientFactory.getTelemetryClient();
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        appinsightClient.report(evtName, {}, {}, sampleRate);
        return result;
    };
};

export const notifyAsync = (
    target: Record<string, object>,
    originalFn: Function,
    evtName: EventName,
    sampleRate: SampleRate
): Function => {
    return async (...args: []): Promise<Function> => {
        const result = await originalFn.apply(target, args);
        const appinsightClient: Client = ClientFactory.getTelemetryClient();
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        appinsightClient.report(evtName, {}, {}, sampleRate);
        return result;
    };
};

export const duration = (
    target: Record<string, object>,
    originalFn: Function,
    evtName: EventName,
    sampleRate: SampleRate
): Function => {
    return (...args: any[]): Function => {
        const markName = performance.startMark('mark');
        const result = originalFn.apply(target, args);
        performance.endMark(markName);
        performance.measure(markName);
        const duration = performance.getMeasurementDuration(markName);
        const appinsightClient: Client = ClientFactory.getTelemetryClient();
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        appinsightClient.report(evtName, {}, { ms: duration }, sampleRate);
        return result;
    };
};

export const durationAsync = (
    target: Record<string, object>,
    originalFn: Function,
    evtName: EventName,
    sampleRate: SampleRate
): Function => {
    return async (...args: any[]): Promise<Function> => {
        const markName = performance.startMark('mark');
        const result = await originalFn.apply(target, args);
        performance.endMark(markName);
        performance.measure(markName);
        const duration = performance.getMeasurementDuration(markName);
        const appinsightClient: Client = ClientFactory.getTelemetryClient();
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        appinsightClient.report(evtName, {}, { ms: duration }, sampleRate);
        return result;
    };
};

export const captureParam = (
    target: Record<string, object>,
    originalFn: Function,
    evtName: EventName,
    sampleRate: SampleRate,
    instructions: ParamRecordConfig | ParamRecordConfig[]
): Function => {
    return (...args: any[]): Function => {
        const result = originalFn.apply(target, args);
        const [customDimensions, customMeasurements] = getParamsData(args, instructions);
        const appinsightClient: Client = ClientFactory.getTelemetryClient();
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        appinsightClient.report(evtName, customDimensions, customMeasurements, sampleRate);
        return result;
    };
};

export const captureParamAsync = (
    target: Record<string, object>,
    originalFn: Function,
    evtName: EventName,
    sampleRate: SampleRate,
    instructions: ParamRecordConfig | ParamRecordConfig[]
): Function => {
    return async (...args: any[]): Promise<Function> => {
        const result = await originalFn.apply(target, args);
        const [customDimensions, customMeasurements] = getParamsData(args, instructions);
        const appinsightClient: Client = ClientFactory.getTelemetryClient();
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        appinsightClient.report(evtName, customDimensions, customMeasurements, sampleRate);
        return result;
    };
};
