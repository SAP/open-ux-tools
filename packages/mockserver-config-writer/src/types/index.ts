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
    path?: string;
    name?: string;
    overwrite?: boolean;
}
