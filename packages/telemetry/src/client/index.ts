import type { Client } from './client';
import { TelemetrySystem } from '../system/system';
import * as telemetryPackageJSON from '../../package.json';
import { ToolsSuiteTelemetryClient } from '../toolsSuiteTelemetry';

class ClientFactory {
    private static clientMap = new Map<string, Client>();

    public static getTelemetryClient(): ToolsSuiteTelemetryClient {
        return ClientFactory.getTelemetryClientByClass(ToolsSuiteTelemetryClient);
    }

    public static getTelemetryClientByClass<T extends Client>(
        clientConstructor: new (appKey: string, extensionName: string, extensionVersion: string) => T
    ): T {
        let client = ClientFactory.clientMap.get(clientConstructor.name) as T;
        if (client) {
            return client;
        }

        client = new clientConstructor(
            telemetryPackageJSON.azureInstrumentationKey,
            telemetryPackageJSON.name,
            telemetryPackageJSON.version
        );

        ClientFactory.clientMap.set(clientConstructor.name, client);
        return client;
    }
}

export { ClientFactory };
