// Manual mock for @sap-ux/axios-extension
export enum ODataVersion {
    v2 = '2.0',
    v4 = '4.0'
}

export enum AbapCloudEnvironment {
    Standalone = 'Standalone',
    EmbeddedSteampunk = 'EmbeddedSteampunk'
}

export const createForAbap = jest.fn();
export const createForAbapOnCloud = jest.fn();

export interface AxiosError extends Error {
    config?: any;
    code?: string;
    request?: any;
    response?: any;
    isAxiosError: boolean;
}

export interface AxiosRequestConfig {
    url?: string;
    method?: string;
    headers?: any;
    params?: any;
    data?: any;
}

export interface ODataServiceInfo {
    name: string;
    id: string;
    odataVersion: string;
}

export interface ODataService {
    metadata: () => Promise<string | undefined>;
}

export interface AbapServiceProvider {
    catalog: (service?: string) => {
        interceptors: {
            request: { use: jest.Mock };
            response: { use: jest.Mock };
        };
        listServices: jest.Mock;
    };
    getSystemInfo?: () => Promise<any>;
    service: (path: string) => ODataService;
}
