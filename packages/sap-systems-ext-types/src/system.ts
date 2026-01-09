interface RequestCount {
    count?: number;
    error?: unknown;
}

export interface CatalogServicesCounts {
    v2Request: RequestCount;
    v4Request: RequestCount;
}

export interface ConnectionStatus {
    message?: string;
    catalogResults?: CatalogServicesCounts;
    connected: boolean;
}
