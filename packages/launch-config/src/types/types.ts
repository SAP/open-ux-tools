import type { ODataVersion } from '@sap-ux/project-access';
import type { FioriToolsProxyConfigBackend } from '@sap-ux/ui5-config';

export enum Arguments {
    FrameworkVersion = '--framework-version',
    Open = '--open',
    Config = '--config'
}

export interface FioriOptions {
    name: string;
    projectRoot: string;
    oDataVersion?: ODataVersion;
    useMockData?: boolean;
    ui5Version?: string;
    ui5VersionUri?: string;
    ui5Local?: boolean;
    ui5LocalVersion?: string;
    startFile?: string;
    backendConfigs?: FioriToolsProxyConfigBackend[];
    urlParameters?: string;
    visible?: boolean;
}

export interface LaunchJSON {
    version: string;
    configurations: LaunchConfig[];
}

export interface LaunchConfig {
    name: string;
    cwd: string;
    runtimeArgs: string[];
    type: 'node';
    request: 'launch';
    runtimeExecutable: string;
    args?: string[];
    windows: {
        runtimeExecutable: string;
        args?: string[];
    };
    console: 'internalConsole';
    internalConsoleOptions: 'openOnSessionStart';
    outputCapture: 'std';
    env: LaunchConfigEnv;
}

export interface LaunchConfigEnv {
    'run.config': string;
    FIORI_TOOLS_UI5_VERSION?: string;
    FIORI_TOOLS_UI5_URI?: string;
    FIORI_TOOLS_BACKEND_CONFIG?: string;
    FIORI_TOOLS_URL_PARAMS?: string;
}

export interface LaunchConfigInfo {
    launchConfigs: LaunchConfig[];
    filePath: string;
}
