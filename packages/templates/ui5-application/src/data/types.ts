export interface Package {
    name: string;
    version?: string;
    description?: string;
    scripts?: Record<string, string>;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
}

export interface App {
    id: string;
    uri?: string;
    version?: string;
    title?: string;
    description?: string;
    baseComponent?: string;
}

export interface UI5 {
    minVersion?: string;
    version?: string;
    descriptorVersion?: string;
}

export interface Ui5App {
    app: App;
    ui5?: UI5;
    package: Package;
}
