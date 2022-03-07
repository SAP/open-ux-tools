import type { EntityKey } from '.';
import { sensitiveData, serializable } from '../decorators';

export enum AuthenticationType {
    Basic = 'basic',
    ReentranceTicket = 'reentranceTicket',
    OAuth2RefreshToken = 'oauth2',
    OAuth2ClientCredential = 'oauth2ClientCredential'
}

export class BackendSystem {
    @serializable public readonly name: string;
    @serializable public readonly url: string;
    @serializable public readonly client?: string;
    @serializable public readonly userDisplayName?: string;
    @sensitiveData public readonly serviceKeys?: unknown;
    @sensitiveData public readonly refreshToken?: string;
    @sensitiveData public readonly username?: string;
    @sensitiveData public readonly password?: string;
    @sensitiveData public readonly authenticationType?: string;

    constructor({
        name,
        url,
        client,
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
        serviceKeys?: unknown;
        refreshToken?: string;
        username?: string;
        password?: string;
        userDisplayName?: string;
        authenticationType?: string;
    }) {
        this.name = name;
        this.url = url;
        this.client = client;
        this.serviceKeys = serviceKeys;
        this.refreshToken = refreshToken;
        this.username = username;
        this.password = password;
        this.userDisplayName = userDisplayName;
        this.authenticationType = authenticationType;
    }
}
export class BackendSystemKey implements EntityKey {
    private url: string;
    private client?: string;

    public static from(system: BackendSystem): EntityKey {
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
