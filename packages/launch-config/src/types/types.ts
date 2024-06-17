export const FIORI_TOOLS_LAUNCH_CONFIG_HANDLER_ID = 'fiori_tools';

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
