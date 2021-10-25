export interface Package {
    name: string;
    version?: string;
    description?: string;
    scripts?: Record<string, string>;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    ui5?: {
        dependencies?: string[];
    };
}

export interface App {
    id: string;
    version?: string;
    title?: string;
    description?: string;
    baseComponent?: string; // UI5 Component `required` by Component.js
    startFile?: string;
    localStartFile?: string;
}

export interface UI5 {
    framework?: 'SAPUI5' | 'OpenUI5';
    frameworkUrl?: string;
    minUI5Version?: string;
    version?: string;
    localVersion?: string;
    typesVersion?: string;
    descriptorVersion?: string;
    ui5Libs?: string | string[];
    ui5Theme?: string;
}

// Additional configurable features
export interface AppOptions {
    codeAssist?: boolean; // Enables code assist
    eslint?: boolean; // Enables Fiori linting
    sapux?: boolean; // Enables Fiori Tools Suite integration
}

export interface Ui5App {
    app: App;
    appOptions?: AppOptions;
    ui5?: UI5;
    package: Package;
}
