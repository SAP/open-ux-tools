/* Types and classes  */
export { ClientFactory } from './base/client/index.js';
export { Client } from './base/client/client.js';
export { ApplicationInsightClient } from './base/client/azure-appinsight-client.js';
export { EventHeader } from './base/types/event-header.js';
export { EventName } from './base/types/event-name.js';
export { SampleRate } from './base/types/sample-rate.js';
export type { TelemetryMeasurements, TelemetryProperties } from './base/types/event.js';

/* API for most common use cases */
export {
    initTelemetrySettings,
    setEnableTelemetry,
    getTelemetrySetting,
    ToolsSuiteTelemetryClient,
    getIdeType
} from './tooling-telemetry/index.js';
export type {
    ToolsSuiteTelemetryInitSettings,
    TelemetryHelperProperties,
    TelemetryEvent
} from './tooling-telemetry/index.js';
export { ToolsId } from './tooling-telemetry/index.js';

/* Decorator and measurements utils */
export { InterceptorTypes } from './base/interceptor/config.js';
export { PerformanceMeasurementAPI } from './base/performance/api.js';
export { ParamRecordConfig, ParamRecordConfigField } from './base/utils/param-processing.js';
export { logTelemetry, logTelemetryAsync } from './base/decorator/index.js';
