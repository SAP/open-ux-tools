interface Window {
    'sap-ui-config': {
        [key: string]: (fnCallback: () => void) => void | Promise<void>;
    };
    [key: string]: string;
}

/**
 * The type definition for a specific library from sap/ui/VersionInfo.load
 *
 * @example
 * import VersionInfo from 'sap/ui/VersionInfo';
 * const ui5Version = await VersionInfo.load({library: 'sap.ui.core'})?.version;
 */
export type SingleVersionInfo = {
    /**
     * The name of the library or application
     */
    name: string
    /**
     * The version of the library or application
     */
    version: string
} | undefined