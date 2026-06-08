// Manual mock for @sap-ux/store

export type SystemType = 'OnPrem' | 'AbapCloud' | 'Generic';
export type ConnectionType = 'abap_catalog' | 'odata_service' | 'generic_host';
export type AuthenticationType = 'basic' | 'reentranceTicket' | 'oauth2';

export class BackendSystem {
    public readonly name: string;
    public readonly url: string;
    public readonly client?: string;
    public readonly userDisplayName?: string;
    public readonly systemType: SystemType;
    public readonly connectionType: ConnectionType;
    public readonly authenticationType?: AuthenticationType;
    public readonly hasSensitiveData?: boolean;
    public readonly systemInfo?: { systemId: string; client: string };
    public readonly serviceKeys?: unknown;
    public readonly refreshToken?: string;
    public readonly username?: string;
    public readonly password?: string;

    constructor({
        name,
        url,
        client,
        systemType,
        serviceKeys,
        refreshToken,
        username,
        password,
        userDisplayName,
        authenticationType,
        connectionType,
        systemInfo
    }: {
        name: string;
        url: string;
        client?: string;
        systemType: SystemType;
        connectionType: ConnectionType;
        serviceKeys?: unknown;
        refreshToken?: string;
        username?: string;
        password?: string;
        userDisplayName?: string;
        authenticationType?: AuthenticationType;
        systemInfo?: { systemId: string; client: string };
    }) {
        this.name = name;
        this.url = url;
        this.client = client;
        this.systemType = systemType;
        this.serviceKeys = serviceKeys;
        this.refreshToken = refreshToken;
        this.username = username;
        this.password = password;
        this.userDisplayName = userDisplayName;
        this.authenticationType = authenticationType;
        this.connectionType = connectionType;
        this.hasSensitiveData = !!(serviceKeys || refreshToken || username || password);
        this.systemInfo = systemInfo;
    }
}

export interface Service {
    name?: string;
    url?: string;
    path?: string;
}

export enum Entity {
    BackendSystems = 'backend-systems'
}

export class BackendSystemKey {
    private readonly url: string;
    private readonly client?: string;

    public static from(system: BackendSystem): BackendSystemKey {
        return new BackendSystemKey({ url: system.url, client: system.client });
    }

    constructor({ url, client }: { url: string; client?: string }) {
        this.url = url.trim().replace(/\/$/, '');
        this.client = client?.trim();
    }

    public getId(): string {
        return this.url + `${this.client ? '/' + this.client : ''}`;
    }
}

export const getService = jest.fn();
export const getFilesystemWatcherFor = jest.fn();
export const getSapToolsDirectory = jest.fn();
export const getBackendSystemType = jest.fn();
