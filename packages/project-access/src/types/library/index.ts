export const enum ReuseLibType {
    Library = 'library',
    Component = 'component'
}

/**
 * Reuse library
 */
export interface ReuseLib {
    name: string;
    path: string;
    type: ReuseLibType;
    uri: string;
    dependencies: string[];
    libRoot: string;
    description?: string;
}

/**
 * Type definition for the library.xml file. Not complete, just parts we need.
 */
export interface LibraryXml {
    library?: {
        name: string;
        vendor?: string;
        version?: string;
        copyright?: string;
        title?: string;
        documentation?: string;
        dependencies?: {
            dependency: {
                libraryName: string;
            }[];
        };
        appData?: {
            manifest?: {
                i18n?: string;
                offline?: boolean;
                deviceTypes?: {
                    desktop?: boolean;
                    phone?: boolean;
                    tablet?: boolean;
                };
                supportedTheme?: string | string[];
                contentDensities?: {
                    cozy?: boolean;
                    compact?: boolean;
                };
                'sap.fiori'?: {
                    registrationId?: string;
                    archeType?: string;
                };
                'sap.platform.abap'?: {
                    uri?: string;
                };
                'sap.platform.hcp'?: {
                    uri?: string;
                };
            };
            selenium?: {
                package?: string;
            };
            jscoverage?: {
                exclude?: {
                    name: string;
                }[];
            };
            documentation?: {
                indexUrl?: string;
                resolve?: string;
            };
            releasenotes?: {
                url?: string;
                resolve?: string;
            };
            ownership?: {
                component?:
                    | string
                    | {
                          name: string;
                          modules?: {
                              module: string[];
                          };
                      }[];
            };
        };
    };
}
