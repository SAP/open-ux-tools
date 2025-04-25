export interface Window {
    'sap-ui-config': {
        [key: string]: (fnCallback: () => void) => void | Promise<void>;
    };
    'sap-ushell-config': {
        [key: string]: unknown;
    };
    [key: string]: string;
}
