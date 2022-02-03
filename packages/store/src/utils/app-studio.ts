/**
 * @todo: This needs to be replaced by the functions from `@sap-ux/btp-utils`
 */

/**
 * Enumeration of environment variables used in AppStudio
 */
export enum ENV {
    PROXY_URL = 'HTTP_PROXY',
    H2O_URL = 'H2O_URL'
}

export function isAppStudio(): boolean {
    return !!process.env[ENV.H2O_URL];
}
