// Manual mock for @sap-ux/ui-components

export enum ActionCalloutStatus {
    Info = 'info',
    Success = 'success',
    Warning = 'warning',
    Error = 'error'
}

export interface IActionCalloutDetail {
    status: ActionCalloutStatus;
    message: string;
    link?: {
        text: string;
        url?: string;
        command?: {
            id: string;
            params?: any;
        };
    };
}
