/* Common  */
export { ClientFactory } from './client/index';
export { Client } from './client/client';
export { ClientType } from './client/model/ClientType';
export { ApplicationInsightClient } from './client/appInsightClient';

/* Low Level API */
export { TelemetrySystem } from './system/system';
export { EventHeader } from './client/model/EventHeader';
export { EventName } from './client/model/EventName';
export { SampleRate } from './client/model/SampleRate';
export { interceptorTypes } from './interceptor/config';
export { PerformanceMeasurementAPI } from './performance/api';
export { ParamRecordConfig, ParamRecordConfigField } from './util/paramProcessing';

/* Decorator */
export { logTelemetry, logTelemetryAsync } from './decorator';
export {
    initTelemetrySettings,
    ToolsSuiteTelemetryClient,
    TelemetryHelperProperties,
    setEnableTelemetry,
    getTelemetrySetting,
    TelemetryEvent,
    TelemetryMeasurements,
    TelemetryProperties,
    ToolsId
} from './toolsSuiteTelemetry';
export const TelemetrySettings = {}; // mock export ot avoid CI arrs. Remove when Guided Help extension TelemetrySettings import removed.
