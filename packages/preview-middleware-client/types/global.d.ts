declare module 'sap/open/ux/preview/global' {
    interface Window {
        'sap-ui-config': {
            [key: string]: (fnCallback: () => void) => void;
        };
    }
}
