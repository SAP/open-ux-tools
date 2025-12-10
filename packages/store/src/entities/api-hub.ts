import type { EntityKey } from '.';
import { sensitiveData } from '../decorators';

export class ApiHubSettings {
    @sensitiveData public readonly apiKey?: string;

    constructor({ apiKey }: { apiKey: string }) {
        this.apiKey = apiKey;
    }
}

export class ApiHubSettingsKey implements EntityKey {
    static SINGLETON: string = 'API_HUB_API_KEY';

    public getId(): string {
        return ApiHubSettingsKey.SINGLETON;
    }
}
