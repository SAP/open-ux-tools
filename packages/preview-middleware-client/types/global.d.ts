interface Window {
    'sap-ui-config': {
        [key: string]: (fnCallback: () => void) => void;
    };
}
