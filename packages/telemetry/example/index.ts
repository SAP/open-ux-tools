import { initTelemetrySettings, ClientFactory } from '../src';
import 'dotenv/config';
import { getDefaultLogger } from '../src/base/utils';

const logger = getDefaultLogger();

/**
 * Example function of sending a telemetry event.
 */
async function sendTelemetryEvent(): Promise<void> {
    logger.info('Reporting...');
    const client = ClientFactory.getTelemetryClient();
    logger.info(`Send event to ${client.getApplicationKey()}`);
    await client.reportEvent({
        eventName: 'TelemetryExample',
        properties: {
            randomProp: `random-${Math.floor(Math.random() * 9.99)}`
        },
        measurements: {
            randomNumeric: Math.floor(Math.random() * 9.99)
        }
    });
    logger.info('Reported telemetry event');
}

// Init telemetry settings before sending any telemetry event
initTelemetrySettings({
    internalFeature: true,
    consumerModule: {
        name: 'OpenUxTools',
        version: '0.1.0'
    }
})
    .then(sendTelemetryEvent)
    .catch((error) => {
        logger.error(error);
    });
