import type { AxiosBasicCredentials } from 'axios';

export enum DeployConfig {
    'DeployToAbap' = 'deploy-to-abap',
    'FioriToolsProxy' = 'fiori-tools-proxy',
    'FioriToolsServestatic' = 'fiori-tools-servestatic'
}

export enum UrlParameters {
    UI2 = '/sap/bc/ui2/start_up?so=%2A',
    Action = 'action=%2A',
    Alias = 'systemAliasesFormat=object',
    Language = 'sap-language=EN',
    ShellType = 'shellType=FLP',
    Depth = 'depth=0'
}

/**
 * Possible destinations for smartlinks configuration
 */
export interface Service extends ServiceConfig {
    source?: string;
}

/**
 * Configuration of a target system.
 */
export interface ServiceConfig {
    url: string;
    client?: string;
    credentials?: AxiosBasicCredentials;
    ignoreCertError?: boolean;
}

/**
 * Configuration for smartlinks config
 */
export interface SmartLinksConfig {
    service?: ServiceConfig;
}

export type TargetMapping = {
    applicationType?: string;
    formFactors?: { [key: string]: boolean };
    semanticAction: string;
    semanticObject: string;
    signature: {
        additionalParameters?: string;
        parameters?: { [key: string]: any };
    };
    title?: string;
    url?: string;
};

export type SystemDetailsResponse = {
    systemAlias?: object;
    targetMappings?: { [key: string]: TargetMapping };
    urlTemplates?: object;
    version?: string;
};

export type InboundTarget = {
    action: string;
    semanticObject: string;
    signature: object;
    title?: string;
    resolutionResult?: {};
};

export type InboundTargetsConfig = { [key: string]: InboundTarget };

export type SmartLinksSandboxConfig = {
    services?: {
        ClientSideTargetResolution?: { adapter?: { config?: { inbounds?: InboundTargetsConfig } } };
    };
};

/**
 * General validation error thrown if app config options contain invalid combinations
 */
export class ValidationError extends Error {
    /**
     * ValidationError constructor.
     *
     * @param message - the error message
     */
    constructor(message: string) {
        super(`Validation error: ${message}`);
        this.name = this.constructor.name;
    }
}
