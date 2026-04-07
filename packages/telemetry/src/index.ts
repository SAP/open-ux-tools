/* Types and classes  */
export { ClientFactory } from './base/client/index';
export { Client } from './base/client/client';
export { ApplicationInsightClient } from './base/client/azure-appinsight-client';
export { EventHeader } from './base/types/event-header';
export { EventName } from './base/types/event-name';
export { SampleRate } from './base/types/sample-rate';
export type { TelemetryMeasurements, TelemetryProperties } from './base/types/event';

/* API for most common use cases */
export {
    initTelemetrySettings,
    setEnableTelemetry,
    getTelemetrySetting,
    ToolsSuiteTelemetryClient,
    getIdeType
} from './tooling-telemetry';
export type { ToolsSuiteTelemetryInitSettings, TelemetryHelperProperties, TelemetryEvent } from './tooling-telemetry';
export { ToolsId } from './tooling-telemetry';

/* Decorator and measurements utils */
export { InterceptorTypes } from './base/interceptor/config';
export { PerformanceMeasurementAPI } from './base/performance/api';
export { ParamRecordConfig, ParamRecordConfigField } from './base/utils/param-processing';
export { logTelemetry, logTelemetryAsync } from './base/decorator';
