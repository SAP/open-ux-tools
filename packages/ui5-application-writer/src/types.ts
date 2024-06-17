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

/**
 * Interface representing additional entries for the README file.
 */
interface AdditionalEntries {
    /** The label for the additional entry. */
    label: string;
    /** The value corresponding to the label of the additional entry. */
    value: string;
}

/**
 * Interface representing optional entries that can be included in the README configuration.
 * This interface allows dynamic properties with specified types.
 */
interface OptionalEntries {
    /**
     * A dynamic property key with a value that can be a string, an array of strings, a boolean,
     * an array of AdditionalEntries, or undefined.
     */
    [key: string]: string | string[] | boolean | AdditionalEntries[] | undefined;
}

/**
 * Interface representing the configuration for generating a README file.
 * Extends OptionalEntries to include dynamic properties along with the core properties.
 */
export interface ReadMe extends OptionalEntries {
    /** The name of the project. */
    projectName: string;
    /** The title of the project. */
    projectTitle: string;
    /** The namespace of the project. */
    projectNamespace: string;
    /** The description of the project. */
    projectDescription: string;
    /** The UI5 theme used in the project. */
    ui5Theme: string;
    /** The minimum UI5 version required for the project. */
    projectUI5Version: string;
    /** Indicates if code assist is enabled in the project. */
    enableCodeAssist: boolean;
    /** Indicates if ESLint is enabled in the project. */
    enableEslint: boolean;
    /** Indicates if TypeScript is enabled in the project. */
    enableTypeScript: boolean;
    /** The generated ID for the README configuration. */
    genId: string;
    /** The version of the generator used for creating the README file. */
    genVersion: string;
    /** The label for the template used in generating the README file. */
    templateLabel: string;
    /** The label indicating the data source type for the project. */
    dataSourceLabel: string;
}

export interface App {
    id: string;
    version?: string;
    title?: string;
    description?: string;
    baseComponent?: string; // UI5 Component `required` by Component.js
    startFile?: string;
    localStartFile?: string;
    /**
     * Read me configuration to generate README.md file
     */
    readMe?: ReadMe;

    /**
     * Defines the template used by the generation tool
     */
    sourceTemplate?: {
        /**
         * Identifies the source template used to generate the application. Set to empty string if not provided.
         */
        id?: string;
        /**
         * Source template version. Set to empty string if not provided.
         */
        version?: string;
        /**
         * Source template tools id. Optional property. Will not be written to manifest.json if not provided
         */
        toolsId?: string;
    };
}

export type UI5Framework = 'SAPUI5' | 'OpenUI5';

export interface UI5 {
    framework: UI5Framework;
    frameworkUrl: string;
    minUI5Version: string;
    version: string;
    localVersion: string;
    typesVersion: string;
    typesPackage: string;
    descriptorVersion: string;
    ui5Libs: string | string[];
    ui5Theme: string;
}

// Additional configurable features
export interface AppOptions {
    codeAssist: boolean; // Enables code assist
    eslint: boolean; // Enables Fiori linting
    sapux: boolean; // Enables Fiori Tools Suite integration

    /**
     * Enables loading of re-use libs
     */
    loadReuseLibs: boolean;

    /**
     * Enable Typescript support and generate all files in Typescript instead of Javascript
     * Enabling Typescript will disable JavaScript codeAssist if also enabled. Typescript code assist will be used instead
     */
    typescript: boolean;

    /**
     * Enable support for importing functionality from npm packages in UI5 applications
     */
    npmPackageConsumption: boolean;

    /**
     * Excludes the index.html from the template and does not add the `start-noflp` script in package.json
     */
    generateIndex?: boolean;
}

export interface Ui5App {
    app: App;
    appOptions?: Partial<AppOptions>;
    ui5?: Partial<UI5>;
    package: Package;
}
