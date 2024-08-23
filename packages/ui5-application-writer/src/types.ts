import type { ProjectType } from '@sap-ux/project-access';
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
    /**
     * The type of project being processed.
     * For projects of type 'CAPJava' or 'CAPNodejs':
     *  - Exclude `ui5-local.yaml` and `.gitignore` from the template.
     *  - Update `package.json` to include only the script `deploy-config`.
     *  - Use full URLs to determine resource URLs in `webapp/index.html` and `flpSandbox.html`.
     * For projects of type 'EDMXBackend':
     *  - Include `ui5-local.yaml` and `.gitignore` in the template.
     *  - Update `package.json` to include the following scripts: start, start-local, build, start-noflp, start-mock, int-test, deploy, and sap-ux.
     *  - Include relative URLs to determine resource URLs in `webapp/index.html` and `flpSandbox.html`.
     */
    projectType: ProjectType;
    version?: string;
    title?: string;
    description?: string;
    baseComponent?: string; // UI5 Component `required` by Component.js
    startFile?: string;
    localStartFile?: string;

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
    customUi5Libs?: string[];
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
