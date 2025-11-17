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
}
