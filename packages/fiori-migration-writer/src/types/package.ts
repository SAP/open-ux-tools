/**
 * Package.json related types for app-migrator
 */

import type { SapUxLayer } from './constants.js';

/**
 * package.json script entries (commands and tasks)
 */
export type Script = {
    name: string;
    command: string;
};

/**
 * Package.json interface
 */
export interface PackageJson {
    name: string;
    description: string;
    startCommand?: string;
    startLocalCommand?: string;
    startNoFlpCommand?: string;
    startVariantsCommand?: string;
    addMockCommand?: boolean;
    sapClientParam?: string;
    flpAppId?: string; // Identifies the application in FLP => SemanticObject-Action
    devDependencies: {
        [key: string]: string;
    };
    ui5Dependencies: string[];
    sapux?: boolean;
    startFile?: string; // relative path to start html
    localStartFile?: string; // relative path to local start html
    runTasks?: Script[];
    enableEslint: boolean;
    sapuxLayer?: SapUxLayer;
}

/**
 * Extended package.json for migration
 */
export interface PackageJsonMigrate extends Omit<PackageJson, 'devDependencies'> {
    pointToIndexHtml?: boolean;
    devDependencies:
        | {
              [key: string]: string;
          }
        | string; // NOTE: string type needed for Freestyle projects with non-standard devDependencies format. Tracked in #38121
    hasDataSource: boolean;
}
