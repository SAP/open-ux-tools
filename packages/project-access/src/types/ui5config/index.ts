export type Nullable<T> = T | null;
export interface MockServerCommonConfiguration {
    debug?: boolean;
    watch?: boolean;
    contextBasedIsolation?: string;
}
export interface MockServerMiddleware {
    name: string;
    configuration: MockServerConfiguration;
}
export interface MockServerService extends MockServerCommonConfiguration {
    metadataPath: string;
    mockdataPath?: string;
    urlPath?: string;
    urlBasePath?: string;
    name?: string;
    generateMockData?: boolean;
    noETag?: boolean;
}
export interface MockServerStaticConfiguration extends MockServerCommonConfiguration {
    service?: Array<MockServerService> | MockServerService;
    services?: Array<MockServerService> | MockServerService;
}

export interface MockServerDynamicConfiguration extends MockServerCommonConfiguration {
    mockFolder: string;
}

export type MockServerConfiguration = MockServerStaticConfiguration | MockServerDynamicConfiguration;
