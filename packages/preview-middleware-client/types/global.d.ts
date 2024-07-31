interface Window {
    'sap-ui-config': {
        [key: string]: (fnCallback: () => void) => void | Promise<void>;
    };
}

type SingleVersionInfo = {
    /**
     * The name of the library or application
     */
    name: string
    /**
     * The version of the library or application
     */
    version: string
}
export type VersionInformation = SingleVersionInfo & {
    libraries: SingleVersionInfo[];
}