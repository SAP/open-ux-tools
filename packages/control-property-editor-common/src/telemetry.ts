interface TelemetryData {
    category: string;
    propertyName?: string;
    controlName?: string;
}

const path = '/preview/api/telemetry';
let enabled: boolean | undefined;

async function isEnabled() {
    if (enabled === undefined) {
        const response = await fetch(path, {method: 'HEAD'});
        enabled = response.status === 200;
    }
    return enabled;
}

/**
 * Reports telemetry data from Control Property Editor.
 *
 * @param data The TelemetryData object, that needs to be reported
 */
export async function reportTelemetry(data: TelemetryData) {
    try {
        if (await isEnabled()) {
            const requestOptions = {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            };

            await fetch(path, requestOptions);

        }
    } catch (_error) {
        // something is wrong with the telemetry service
        enabled = false;
    }
}

/**
 * Reset the enabled state of the telemetry module.
 */
export function reset() {
    enabled = undefined;
}