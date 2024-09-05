import type { ProjectType } from '@sap-ux/project-access';

/**
 * SAP UX Layer
 */
export enum SapUxLayer {
    VENDOR = 'VENDOR',
    CUSTOMER_BASE = 'CUSTOMER_BASE'
}
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
    sapuxLayer?: SapUxLayer;
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

/**
 * Configuration for a UI5 project.
 */
export interface UI5 {
    /**
     * The UI5 framework being used (e.g. OpenUI5, SAPUI5)
     */
    framework: UI5Framework;
    /**
     * URL for UI5 framework.
     */
    frameworkUrl: string;
    /**
     * The minimum required UI5 version for the project.
     */
    minUI5Version: string;
    /**
     * The specific version of the UI5 framework being used in the project.
     */
    version: string;
    /**
     * Local version of the UI5 application.
     */
    localVersion: string;
    /**
     * Types version for UI5.
     */
    typesVersion: string;
    /**
     * UI5 types package name.
     */
    typesPackage: string;
    /**
     * The manifest descriptor version.
     */
    descriptorVersion: string;
    /**
     * The UI5 libraries that are added as part of the project. (e.g. manifest.json, ui5-local.yaml, flpSandbox.html)
     *
     * ui5-local.yaml:
     *
     * @example
     * ```yaml
     * libraries:
     *      -name: sap.m
     *      -name: sap.ui.core
     *      -name: sap.ushell
     *      -name: sap.fe.templates
     *```
     * flpSandbox.html:
     * @example
     * ```HTML
     * <script id="sap-ui-bootstrap"
     *      data-sap-ui-libs="sap.m,sap.ui.core,sap.ushell,sap.fe.templates">
     * </script>
     * ```
     */
    ui5Libs: string | string[];
    /**
     * (Optional) These libraries will be added to the manifest.json file as sap.ui5 dependencies.
     * If `manifestLibs` not provided, `ui5Libs` libraries added to the manifest.json by default.
     *
     * manifest.json:
     *
     * @example
     * ```json
     * "sap.ui5": {
     *  "flexEnabled": true,
     *  "dependencies": {
     *      "minUI5Version": "1.121.1",
     *      "libs": {
     *          "sap.m": {},
     *          "sap.ui.core": {},
     *          "sap.ushell": {},
     *          "sap.fe.templates": {}
     *      }
     *  },
     * }
     * ```
     */
    manifestLibs?: string | string[];
    /**
     * The default UI5 theme to be used in the project (e.g. 'sap_fiori_3').
     */
    ui5Theme: string;
    /**
     * (Optional) Custom UI5 libraries that are included in the project.
     * Added with ui5 dependencies in the manifest.json.
     */
    customUi5Libs?: string[];
}

export const enum ApiHubType {
    apiHub = 'API_HUB',
    apiHubEnterprise = 'API_HUB_ENTERPRISE'
}

/**
 * Defines the api hub service properties or enterprise and non-enterprise versions
 */
export interface ApiHubConfig {
    apiHubKey: string;
    apiHubType: ApiHubType;
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
    /**
     * Api Hub configuration
     */
    apiHubConfig?: ApiHubConfig;
}

export interface Ui5App {
    app: App;
    appOptions?: Partial<AppOptions>;
    ui5?: Partial<UI5>;
    package: Package;
}
