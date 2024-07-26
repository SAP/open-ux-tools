declare module 'sap/open/ux/tools/preview/global' {
    interface Window {
        'sap-ui-config': {
            'xx-bootTask': (fnCallback: () => void) => void;
        };
    }
}
