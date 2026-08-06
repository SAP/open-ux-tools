import type { EntityKey } from './index.js';
import type { AuthenticationType, ConnectionType, SystemType, SystemSource } from '../types.js';
import { getSensitiveDataProperties, sensitiveData, serializable } from '../decorators/index.js';
import { hasAnyValue } from '../utils/index.js';

export class BackendSystem {
    @serializable public readonly name: string;
    @serializable public readonly url: string;
    @serializable public readonly client?: string;
    @serializable public readonly userDisplayName?: string;
    @serializable public readonly systemType: SystemType;
    @serializable public readonly connectionType: ConnectionType;
    @serializable public readonly authenticationType?: AuthenticationType;
    @serializable public readonly hasSensitiveData?: boolean;
    @serializable public readonly systemInfo?: { systemId: string; client: string };
    @sensitiveData public readonly serviceKeys?: unknown;
    @sensitiveData public readonly refreshToken?: string;
    @sensitiveData public readonly username?: string;
    @sensitiveData public readonly password?: string;
    /**
     * Runtime-only marker for the origin of a system that is not stored in `systems.json`.
     * Deliberately NOT `@serializable` so it is never persisted (the hybrid store writes only
     * decorated properties). Set in memory for systems merged from an external source, e.g. `'adt'`
     * for entries backed by ADT's `destinations.json`.
     */
    public readonly source?: SystemSource;

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
        systemInfo,
        source
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
        source?: SystemSource;
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
        const sensitiveProps = getSensitiveDataProperties<BackendSystem>(this);
        this.hasSensitiveData = hasAnyValue(this, sensitiveProps);
        this.systemInfo = systemInfo;
        this.source = source;
    }
}

export class BackendSystemKey implements EntityKey {
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
