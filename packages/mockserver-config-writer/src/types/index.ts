export interface MockserverConfig {
    webappPath: string;
    packageJsonConfig?: PackageJsonMockConfig;
    ui5MockYamlConfig?: Ui5MockYamlConfig;
}

export interface PackageJsonMockConfig {
    script?: string;
    mockserverModule?: string;
    mockserverVersion?: string;
}

export interface Ui5MockYamlConfig {
    // overwrites all services and annotations based on manifest
    overwrite?: boolean;
}
