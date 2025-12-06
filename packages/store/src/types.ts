export interface ServiceOptions {
    /** optional `baseDirectory`. Can be an absolute or a relative path.
     * Relative paths will be assumed to start in the user's home directory */
    baseDirectory?: string;
    [key: string]: unknown;
}

export const SystemType = {
    AbapCloud: 'AbapCloud',
    AbapOnPrem: 'OnPrem',
    Generic: 'Generic'
} as const;

export type SystemType = (typeof SystemType)[keyof typeof SystemType];

export const AuthenticationType = {
    Basic: 'basic',
    ReentranceTicket: 'reentranceTicket',
    OAuth2RefreshToken: 'oauth2',
    OAuth2ClientCredential: 'oauth2ClientCredential'
} as const;

export type AuthenticationType = (typeof AuthenticationType)[keyof typeof AuthenticationType];

export const ConnectionType = {
    AbapCatalog: 'abap_catalog', // connects to an abap catalog
    GenericHost: 'generic_host', // a generic host e.g could be a partial url
    ODataService: 'odata_service' // full odata service url
} as const;

export type ConnectionType = (typeof ConnectionType)[keyof typeof ConnectionType];

export type BackendSerializableKeys =
    | 'name'
    | 'url'
    | 'client'
    | 'systemType'
    | 'authenticationType'
    | 'connectionType';
