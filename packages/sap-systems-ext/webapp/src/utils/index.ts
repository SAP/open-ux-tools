import type { VsCodeApi } from '../types';

// Global access to postMessage is required for controls that do not have state and so do not use redux middleware
declare global {
    interface Window {
        vscode: VsCodeApi;
    }
}

declare let acquireVsCodeApi: () => (typeof window)['vscode'];

export const initVsCodeApi = (): void => {
    try {
        window.vscode = acquireVsCodeApi();
    } catch (e) {
        console.error("Can't acquireVsCodeApi, seems I'm not running in VSCode web view");
    }
};
