import type { MockDataGeneratorJsonValue } from '@sap-ux/ui5-config';

export interface MockserverConfig {
    webappPath: string;
    packageJsonConfig?: PackageJsonMockConfig;
    ui5MockYamlConfig?: Ui5MockYamlConfig;
}

export interface PackageJsonMockConfig {
    script?: string;
    mockserverModule?: string;
    mockserverVersion?: string;
    // optional, when set to true, package.json contents won't be changed
    skip?: boolean;
}

export interface Ui5MockYamlConfig {
    // overwrites all services and annotations based on manifest
    overwrite?: boolean;
    /**
     * Mapping for which data source external service references should be resolved.
     */
    resolveExternalServiceReferences?: Record<string, boolean>;
    /**
     * Explicitly opt the application into a mock data generator provider.
     */
    mockDataGenerator?: MockDataGeneratorWriterConfig;
}

export interface MockDataGeneratorWriterConfig {
    /** Package installed in the application's devDependencies. */
    packageName?: string;
    /** Package export specifier loaded by the standard mockserver. */
    providerName?: string;
    /** Version or package range installed in the application. */
    version?: string;
    /** Maximum provider generation time accepted by the standard mockserver. */
    timeoutMs?: number;
    /** Provider-owned JSON configuration. */
    options?: Readonly<Record<string, MockDataGeneratorJsonValue>>;
}
