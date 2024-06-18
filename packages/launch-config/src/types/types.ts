export const FIORI_TOOLS_LAUNCH_CONFIG_HANDLER_ID = 'fiori_tools';

export interface FioriOptions {
    name: string;
    projectRoot: string;
    projectVersion?: FioriElementsVersion;
    useMockData?: boolean;
    ui5Version?: string;
    ui5VersionUri?: string;
    ui5Local?: boolean;
    ui5LocalVersion?: string;
    startFile?: string;
    backendConfigs?: BackendConfig[];
    urlParameters?: string;
    visible?: boolean;
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

export interface BackendConfig {
    path: string;
    name?: string;
    url?: string;
    client?: string;
    destination?: string;
    pathPrefix?: string;
    scp?: boolean;
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
