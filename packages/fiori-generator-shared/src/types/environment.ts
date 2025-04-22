import type { WorkspaceConfiguration } from 'vscode';

/**
 * Interface for the yeoman environment.
 */
export interface YeomanEnvironment {
    conflicter: {
        force: boolean;
    };
    adapter: {
        actualAdapter: unknown;
    };
}

/**
 * Interface for the VSCode instance.
 */
export interface VSCodeInstance {
    commands: { executeCommand: (command: string, ...rest: any[]) => Promise<void> };
    workspace: WorkspaceConfiguration;
}

type HostEnvironment = 'vscode' | 'bas' | 'cli';
export type HostEnvironmentId = 'VSCode' | 'SBAS' | 'CLI';

export const hostEnvironment: {
    [key in HostEnvironment]: {
        name: string;
        technical: HostEnvironmentId;
    };
} = {
    vscode: {
        name: 'Visual Studio Code',
        technical: 'VSCode'
    },
    bas: {
        name: 'SAP Business Application Studio',
        technical: 'SBAS'
    },
    cli: {
        name: 'CLI',
        technical: 'CLI'
    }
};

export enum ApiHubType {
    apiHub = 'API_HUB',
    apiHubEnterprise = 'API_HUB_ENTERPRISE'
}
