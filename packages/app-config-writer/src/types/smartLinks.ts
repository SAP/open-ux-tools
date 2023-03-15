import type { AxiosBasicCredentials } from 'axios';
import type { AbapTarget } from '@sap-ux/ui5-config';

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

export type DeployTarget = Pick<AbapTarget, 'url' | 'client' | 'destination' | 'scp'>;

/**
 * Configuration of a target system.
 */
export interface TargetConfig {
    target: DeployTarget;
    ignoreCertErrors?: boolean;
    auth?: AxiosBasicCredentials;
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
    signature: {
        parameters: object;
        additionalParameters: string;
    };
    title?: string;
    resolutionResult?: {};
};

export type InboundTargetsConfig = { [key: string]: InboundTarget };

export type SmartLinksSandboxConfig = {
    services?: {
        ClientSideTargetResolution?: {
            adapter?: {
                config?: {
                    inbounds?: InboundTargetsConfig;
                };
            };
        };
    };
};
