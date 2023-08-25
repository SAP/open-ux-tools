interface TelemetryData {
    category: string;
    propertyName?: string;
    controlName?: string;
}

/**
 * Reports telemetry data from Control Property Editor.
 *
 * @param data The TelemetryData object, that needs to be reported
 */
export function reportTelemetry(data: TelemetryData) {
    const requestOptions = {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    };
    fetch('./control-property-editor/report-telemetry', requestOptions)
        .then(async (response) => {
            console.log(response);
        })
        .catch((error) => {
            console.error('There was an error!', error);
        });
}
