import type { EventName } from '../client/model/EventName';
import type { SampleRate } from '../client/model/SampleRate';
import { ClientFactory } from '../client';
import type { Client } from '../client/client';
import { PerformanceMeasurementAPI as performance } from '../performance/api';
import type { ParamRecordConfig } from '../util/paramProcessing';
import { getParamsData } from '../util/paramProcessing';

export const notify = (
    target: Record<string, object>,
    originalFn: Function,
    evtName: EventName,
    sampleRate: SampleRate
): Function => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (...args: any[]): Function => {
        const result = originalFn.apply(target, args);
        const appinsightClient: Client = ClientFactory.getTelemetryClient();
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return async (...args: any[]): Promise<Function> => {
        const result = await originalFn.apply(target, args);
        const appinsightClient: Client = ClientFactory.getTelemetryClient();
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (...args: any[]): Function => {
        const markName = performance.startMark('mark');
        const result = originalFn.apply(target, args);
        performance.endMark(markName);
        performance.measure(markName);
        const duration = performance.getMeasurementDuration(markName);
        const appinsightClient: Client = ClientFactory.getTelemetryClient();
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return async (...args: any[]): Promise<Function> => {
        const markName = performance.startMark('mark');
        const result = await originalFn.apply(target, args);
        performance.endMark(markName);
        performance.measure(markName);
        const duration = performance.getMeasurementDuration(markName);
        const appinsightClient: Client = ClientFactory.getTelemetryClient();
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (...args: any[]): Function => {
        const result = originalFn.apply(target, args);
        const [customDimensions, customMeasurements] = getParamsData(args, instructions);
        const appinsightClient: Client = ClientFactory.getTelemetryClient();
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return async (...args: any[]): Promise<Function> => {
        const result = await originalFn.apply(target, args);
        const [customDimensions, customMeasurements] = getParamsData(args, instructions);
        const appinsightClient: Client = ClientFactory.getTelemetryClient();
        appinsightClient.report(evtName, customDimensions, customMeasurements, sampleRate);
        return result;
    };
};
