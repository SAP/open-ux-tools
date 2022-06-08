/**
 * TODO: these types should be imported from project spec package
 */
export interface ApplicationStructure {
    manifest: string;
    changes: string;
    mainService: string;
    services: { [index: string]: ServiceSpecification };
    annotations?: { [serviceIndex: string]: string[] };
    app?: string;
    i18n?: string;
    ext?: string;
    controller?: string;
    view?: string;
    fragment?: string;
}

export interface ServiceSpecification {
    uri?: string;
    local?: string;
    annotations?: {
        uri?: string;
        local?: string;
    };
}

export const enum ProjectType {
    Cap = 'Cap',
    Edmx = 'Edmx'
}

export const enum DetailedProjectType {
    Edxm = 'EDMX Backend',
    CAPNode = 'CAP Node.js',
    CAPJava = 'CAP Java'
}

export interface Project {
    root: string;
    sync: boolean | string[];
    apps: { [index: string]: ApplicationStructure };
    type: ProjectType;
}

export interface BackendConfig {
    path: string;
    url: string;
    destination?: string;
    scp?: boolean;
    client?: string;
}

export interface MiddlewareProxy {
    name: string;
    configuration: {
        backend: BackendConfig[];
        ui5?: {
            path: string[];
            url: string;
            version?: string;
        };
    };
}

export interface FileData {
    dataSourceUri: string;
    fileContent: string;
}

export interface SpecificationVersion {
    version: string;
    ui5?: string;
    patch?: string;
}

export interface ServeStaticConfig {
    path: string;
    src: string;
}

export interface ServeStaticMiddleware {
    name: string;
    afterMiddleware?: string;
    beforeMiddleware?: string;
    configuration: {
        paths: ServeStaticConfig[];
    };
}

export interface AppReloadMiddleware {
    name: string;
    configuration?: {
        path?: string;
        ext?: string;
        port?: number;
        debug?: boolean;
    };
}

export interface MockServerCommonConfiguration {
    debug?: boolean;
    watch?: boolean;
    contextBasedIsolation?: string;
}

export interface MockServerService extends MockServerCommonConfiguration {
    metadataXmlPath: string;
    urlPath?: string;
    urlBasePath?: string;
    name?: string;
    mockdataRootPath?: string;
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

export interface MockServerMiddleware {
    name: string;
    configuration: MockServerConfiguration;
}

export interface UI5Yaml {
    specVersion: string;
    metadata: {
        name: string;
    };
    type: string;
    server: {
        customMiddleware: Array<AppReloadMiddleware | MiddlewareProxy | ServeStaticMiddleware | MockServerMiddleware>;
    };
}

export interface FioriSandboxConfig {
    applications: {
        [index: string]: {
            additionalInformation: string;
            applicationType: string;
            url: string;
        };
    };
}
