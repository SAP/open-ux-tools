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

        // ApplicationInsights v3+ requires InstrumentationKey=<uuid> format.
        // The IngestionEndpoint/LiveEndpoint must be set explicitly: the @azure/monitor-opentelemetry-exporter
        // (>= 1.0.0-beta.44, pulled in by applicationinsights 3.16.0) refuses to follow the global endpoint's
        // cross-origin 307/308 redirect to the regional endpoint (isSameRegisteredDomain guard), so a bare
        // InstrumentationKey would silently drop all telemetry. The endpoints default to the westus2 region
        // and can be overridden by the consumer via initTelemetrySettings.
        const instrumentationKey = key === instrumentationKeyPlaceholder ? '00000000-0000-0000-0000-000000000000' : key;

        return (
            `InstrumentationKey=${instrumentationKey};` +
            `IngestionEndpoint=${TelemetrySettings.azureIngestionEndpoint};` +
            `LiveEndpoint=${TelemetrySettings.azureLiveEndpoint};`
        );
    }
}

export { ClientFactory };
