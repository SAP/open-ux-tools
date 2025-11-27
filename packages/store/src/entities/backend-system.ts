import type { EntityKey } from '.';
import type { AuthenticationType, SystemType } from '../types';
import { getSensitiveDataProperties, sensitiveData, serializable } from '../decorators';
import { hasAnyValue } from '../utils';

export class BackendSystem {
    @serializable public readonly name: string;
    @serializable public readonly url: string;
    @serializable public readonly client?: string;
    @serializable public readonly userDisplayName?: string;
    @serializable public readonly systemType?: SystemType;
    @serializable public readonly authenticationType?: AuthenticationType;
    @serializable public readonly hasSensitiveData?: boolean;
    @sensitiveData public readonly serviceKeys?: unknown;
    @sensitiveData public readonly refreshToken?: string;
    @sensitiveData public readonly username?: string;
    @sensitiveData public readonly password?: string;

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
        authenticationType
    }: {
        name: string;
        url: string;
        client?: string;
        systemType?: SystemType;
        serviceKeys?: unknown;
        refreshToken?: string;
        username?: string;
        password?: string;
        userDisplayName?: string;
        authenticationType?: AuthenticationType;
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
        const sensitiveProps = getSensitiveDataProperties<BackendSystem>(this);
        this.hasSensitiveData = hasAnyValue(this, sensitiveProps);
    }
}

export class BackendSystemKey implements EntityKey {
    private name: string;

    public static from(system: BackendSystem): BackendSystemKey {
        return new BackendSystemKey({ name: system.name });
    }

    constructor({ name }: { name: string }) {
        this.name = name.trim();
    }

    public getId(): string {
        return this.name;
    }
}
