import type { AppWizard } from '@sap-devx/yeoman-ui-types';
import type { ProviderSystem } from '@sap/service-provider-apis';
import type { BusinessObjectType, CDSType } from '@sap/subaccount-destination-service-provider';
import type { IVSCodeExtLogger, LogLevel } from '@vscode-logging/logger';
import type { BaseOptions } from 'yeoman-generator';
import type { UI_SERVICE_CACHE } from '../utils/index.js';

export interface PromptOptions {
    systemName: string;
    businessObject: string;
    path?: string;
    user?: string;
    password?: string;
    providerSystem?: ProviderSystem;
    // type and id optional until BAS release updated interface
    type?: BusinessObjectType | CDSType;
    id?: string;
}

export type AppGenSystemSystemData = {
    name?: string;
    url?: string;
    client?: string;
    destination?: string;
};

export interface AppGenData {
    type: string;
    system: AppGenSystemSystemData;
    service: {
        url: string;
        metadata: string;
    };
    project?: {
        targetPath: string;
        name: string;
    };
}

export type ReqAuth = {
    username: string;
    password: string;
};

export const BAS_OBJECT = {
    BUSINESS_OBJECT: 'BO INTERFACE' as BusinessObjectType,
    CDS: 'CDS VIEW' as CDSType
};

export interface AppWizardWithCache extends AppWizard {
    [UI_SERVICE_CACHE]?: any;
}

/**
 * Minimal structural type for the injected VS Code instance — only the members this
 * generator touches. Avoids depending on the `vscode` ambient types at runtime.
 */
export type VSCodeInstance = {
    commands?: { executeCommand?: (command: string, ...args: unknown[]) => unknown };
};

/**
 * Options accepted by this generator on top of the base Yeoman options. Yeoman v8's `BaseOptions`
 * no longer carries an index signature, so the custom options read here must be declared explicitly.
 */
export type UiServiceGeneratorOptions = BaseOptions & {
    vscode?: VSCodeInstance;
    logger?: IVSCodeExtLogger;
    logLevel?: LogLevel;
    force?: boolean;
    data?: PromptOptions & { appGenLaunchCommand?: string };
};
