interface TelemetryData {
    category: string;
    actionName?: string;
    propertyName?: string;
    controlName?: string;
    telemetryEventIdentifier?: string;
    dialogName?: string;
    quickActionSteps?: number;
    ui5Version?: string;
    appType?: string;
}

let enabled = false;

export function enableTelemetry() {
    enabled = true;
}

export function disableTelemetry() {
    enabled = false;
}

/**
 * Reports telemetry data from Control Property Editor.
 *
 * @param data The TelemetryData object, that needs to be reported
 * @returns {Promise<void>}
 */
export async function reportTelemetry(data: TelemetryData): Promise<void> {
    try {
        if (enabled) {
            const requestOptions = {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            };

            await fetch('/preview/api/telemetry', requestOptions);
        }
    } catch (_error) {
        // something is wrong with the telemetry service
        disableTelemetry();
    }
}
