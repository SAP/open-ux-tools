import type { VsCodeApi } from '../types';

// Global access to postMessage is required for controls that do not have state and so do not use redux middleware
declare global {
    interface Window {
        vscode: VsCodeApi;
    }
}

declare let acquireVsCodeApi: () => typeof globalThis.vscode;

export const initVsCodeApi = (): void => {
    try {
        globalThis.vscode = acquireVsCodeApi();
    } catch {
        // Ignore errors in case not running in VS Code
    }
};
