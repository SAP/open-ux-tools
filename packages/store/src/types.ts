export interface ServiceOptions {
    /** optional `baseDirectory`. Can be an absolute or a relative path.
     * Relative paths will be assumed to start in the user's home directory */
    baseDirectory?: string;
    [key: string]: unknown;
}

export const SystemType = {
    AbapCloud: 'AbapCloud',
    AbapOnPrem: 'OnPrem'
};

export type SystemType = (typeof SystemType)[keyof typeof SystemType];

export const AuthenticationType = {
    Basic: 'basic',
    ReentranceTicket: 'reentranceTicket',
    OAuth2RefreshToken: 'oauth2',
    OAuth2ClientCredential: 'oauth2ClientCredential'
} as const;

export type AuthenticationType = (typeof AuthenticationType)[keyof typeof AuthenticationType];
