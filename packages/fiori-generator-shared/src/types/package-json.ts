import type { UI5FlexLayer } from '@sap-ux/project-access';

/**
 * Script entry (commands and tasks) for package.json
 */
export type Script = {
    name: string;
    command: string;
};

/**
 * Base package.json configuration shared across Fiori generation and migration tools.
 *
 * This interface contains the common fields used for package.json generation in both
 * app generation and migration workflows.
 */
export interface BasePackageJsonConfig {
    /** Package name */
    name: string;

    /** Package description */
    description: string;

    /** NPM script command to start the application */
    startCommand?: string;

    /** NPM script command to start the application locally */
    startLocalCommand?: string;

    /** NPM script command to start without FLP */
    startNoFlpCommand?: string;

    /** NPM script command to start with variants management */
    startVariantsCommand?: string;

    /** Whether to add mock server command */
    addMockCommand?: boolean;

    /** SAP client parameter */
    sapClientParam?: string;

    /** FLP application ID - identifies the application in FLP => SemanticObject-Action */
    flpAppId?: string;

    /** Development dependencies */
    devDependencies: {
        [key: string]: string;
    };

    /** UI5 dependencies array */
    ui5Dependencies: string[];

    /** Whether this is a SAP UX project */
    sapux?: boolean;

    /** Relative path to start HTML file */
    startFile?: string;

    /** Relative path to local start HTML file */
    localStartFile?: string;

    /** Run tasks configuration */
    runTasks?: Script[];

    /** Whether ESLint is enabled */
    enableEslint: boolean;

    /** SAP UX layer configuration */
    sapuxLayer?: UI5FlexLayer;
}
