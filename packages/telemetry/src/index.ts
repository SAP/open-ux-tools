/* Types and classes  */
export { ClientFactory } from './base/client/index';
export { Client } from './base/client/client';
export { ApplicationInsightClient } from './base/client/azure-appinsight-client';
export { EventHeader } from './base/types/event-header';
export { EventName } from './base/types/event-name';
export { SampleRate } from './base/types/sample-rate';
export { TelemetryMeasurements, TelemetryProperties } from './base/types/event';

/* API for most common use cases */
export {
    initTelemetrySettings,
    setEnableTelemetry,
    getTelemetrySetting,
    ToolsSuiteTelemetryClient,
    ToolsSuiteTelemetryInitSettings,
    TelemetryHelperProperties,
    TelemetryEvent,
    ToolsId
} from './tooling-telemetry';

/* Value Help Telemetry Events */
export {
    VALUE_HELP_TELEMETRY_EVENTS,
    ValueHelpDetectedProperties,
    ValueHelpDownloadDecisionProperties,
    ValueHelpDownloadPerformanceProperties,
    ValueHelpDetectedSender,
    ValueHelpDownloadDecisionSender,
    ValueHelpDownloadPerformanceSender,
    createValueHelpPerformanceTracker
} from './events/value-help-telemetry';

/* Decorator and measurements utils */
export { InterceptorTypes } from './base/interceptor/config';
export { PerformanceMeasurementAPI } from './base/performance/api';
export { ParamRecordConfig, ParamRecordConfigField } from './base/utils/param-processing';
export { logTelemetry, logTelemetryAsync } from './base/decorator';
