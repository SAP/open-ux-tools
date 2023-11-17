import type { Client } from './client';
import { ToolsSuiteTelemetryClient } from '../../tooling-telemetry';
import { TelemetrySettings } from '../config-state';

class ClientFactory {
    private static clientMap = new Map<string, Client>();

    public static getTelemetryClient(): ToolsSuiteTelemetryClient {
        return ClientFactory.getTelemetryClientByClass<ToolsSuiteTelemetryClient>(ToolsSuiteTelemetryClient);
    }

    private static getTelemetryClientByClass<T extends Client>(
        clientConstructor: new (appKey: string, extensionName: string, extensionVersion: string) => T
    ): T {
        let client = ClientFactory.clientMap.get(clientConstructor.name) as T;
        if (client) {
            return client;
        }

        client = new clientConstructor(
            TelemetrySettings.azureInstrumentationKey,
            TelemetrySettings.telemetryLibName,
            TelemetrySettings.telemetryLibVersion
        );

        ClientFactory.clientMap.set(clientConstructor.name, client);
        return client;
    }
}

export { ClientFactory };
