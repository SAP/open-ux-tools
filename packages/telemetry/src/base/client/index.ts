import type { Client } from './client.js';
import { ToolsSuiteTelemetryClient } from '../../tooling-telemetry/index.js';
import { TelemetrySettings } from '../config-state.js';

const instrumentationKeyPlaceholder = 'ApplicationInsightsInstrumentationKeyPLACEH0LDER';
/**
 * Factory to get telemetry client instance.
 */
class ClientFactory {
    private static readonly clientMap = new Map<string, Client>();

    /**
     * Get singleton instance of default telemetry client for Azure app insights.
     *
     * @returns Telemetry client for Azure app insights
     */
    public static getTelemetryClient(): ToolsSuiteTelemetryClient {
        return ClientFactory.getTelemetryClientByClass<ToolsSuiteTelemetryClient>(ToolsSuiteTelemetryClient);
    }

    /**
     * Get singleton instance of telemetry client based on the generics type. Currently, we only support
     * telemetry client for Azure app insights.
     *
     * @param clientConstructor Class passed in as construtor function. Needs to be subclass of Client class
     * @returns Subclass of telemetry Client class
     */
    public static getTelemetryClientByClass<T extends Client>(
        clientConstructor: new (appKey: string, extensionName: string, extensionVersion: string) => T
    ): T {
        let client = ClientFactory.clientMap.get(clientConstructor.name) as T;
        if (client) {
            return client;
        }

        const connectionString = ClientFactory.buildConnectionString(TelemetrySettings.azureInstrumentationKey);
        client = new clientConstructor(
            connectionString,
            TelemetrySettings.consumerModuleName,
            TelemetrySettings.consumerModuleVersion
        );

        ClientFactory.clientMap.set(clientConstructor.name, client);
        return client;
    }

    private static buildConnectionString(key: string): string {
        if (!key) {
            return '';
        }

        // ApplicationInsights v3+ requires InstrumentationKey=<uuid> format
        const instrumentationKey = key === instrumentationKeyPlaceholder
            ? '00000000-0000-0000-0000-000000000000'
            : key;

        return `InstrumentationKey=${instrumentationKey}`;
    }
}

export { ClientFactory };
