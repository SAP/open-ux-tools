export interface Package {
    name: string;
    version?: string;
    description?: string;
    scripts?: Record<string, string>;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    ui5?: {
        dependencies?: string[];
    }
}

export interface App {
    id: string;
    uri?: string; // What is this?
    version?: string; // What is this?
    title?: string;
    description?: string;
    baseComponent?: string; // UI5 Component `required` by Component.js
    flpAppId?: string;
}

export interface UI5 {
    minVersion?: string;
    version?: string;
	localVersion?: string;
    typesVersion?: string;
    descriptorVersion?: string;
    ui5Libs?: string;
	ui5Theme?: string;
}

export interface Ui5App {
    app: App;
    ui5?: UI5;
    package: Package;
}
