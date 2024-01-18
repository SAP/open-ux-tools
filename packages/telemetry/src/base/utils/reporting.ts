import * as appInsights from 'applicationinsights';
import { configAzureTelemetryClient } from './azure-client-config';
import { TelemetrySettings } from '../config-state';
import { EventName } from '../types';

const parseErrorStack = (errorStack: string): string[] => {
    const regexps = [/sap-ux.+/gi, /[a-zA-Z-]+\/ide-extension\/.+/gi, /(\/telemetry\/.+)/gi];
    const parsedStack: string[] = [];

    const filtered = errorStack.split('\n').filter((line: string) => !!/^\s*at .*(\S+:\d+|\(native\))/m.exec(line));
    if (!filtered.length) {
        return parsedStack;
    }

    filtered.forEach((line: string) => {
        let sanitizedLine = line.replace(/^\s+/, '');
        const lineRegexp = / (\((.+):(\d+):(\d+)\)$)/;
        const location = lineRegexp.exec(line);
        if (!location) {
            return;
        }

        let filepath = null;
        const normalizedFilepath = location[2].replace(/\\/g, '/');
        for (const regexp of regexps) {
            const match = regexp.exec(normalizedFilepath);
            if (match) {
                filepath = match[0];
                break;
            }
        }
        if (!filepath) {
            return;
        }

        sanitizedLine = sanitizedLine.replace(location[0], '');
        const functionName = sanitizedLine.split(/\s+/).slice(1).join('');
        const lineNumber = location[3];
        const columnNumber = location[4];
        const parsedStackLine = `${functionName} at (${filepath}:${lineNumber}:${columnNumber});`;
        parsedStack.push(parsedStackLine);
    });

    return parsedStack;
};

let reportingTelemetryClient: appInsights.TelemetryClient;

export const reportRuntimeError = (error: Error): void => {
    if (process.env.SAP_UX_FIORI_TOOLS_DISABLE_TELEMETRY?.trim() !== 'true') {
        reportingTelemetryClient = new appInsights.TelemetryClient(TelemetrySettings.azureInstrumentationKey);
        configAzureTelemetryClient(reportingTelemetryClient);
    }

    const properties: { [key: string]: string } = { message: error.message };
    if (error.stack) {
        const parsedStack = parseErrorStack(error.stack);
        if (parsedStack.length) {
            properties.stack = parsedStack.join(' \n');
        }
    }
    const telemetryEvent: appInsights.Contracts.EventTelemetry = {
        name: EventName.TELEMETRY_SETTINGS_INIT_FAILED,
        properties,
        measurements: {}
    };
    if (process.env.SAP_UX_FIORI_TOOLS_DISABLE_TELEMETRY !== 'true') {
        reportingTelemetryClient.trackEvent(telemetryEvent);
    }
};

export const reportEnableTelemetryOnOff = (
    enableTelemetry: boolean,
    commonProperties: Record<string, string>
): void => {
    const telemetryEvent: appInsights.Contracts.EventTelemetry = {
        name: EventName.DISABLE_TELEMETRY,
        properties: {
            disableTelemetry: `${!enableTelemetry}`,
            ...commonProperties
        },
        measurements: {}
    };
    if (process.env.SAP_UX_FIORI_TOOLS_DISABLE_TELEMETRY !== 'true') {
        reportingTelemetryClient.trackEvent(telemetryEvent);
    }
};
