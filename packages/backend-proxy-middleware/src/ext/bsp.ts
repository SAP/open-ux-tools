import { yellow, cyan } from 'chalk';
import type { Options } from 'http-proxy-middleware';
import i18n from 'i18next';
import prompts from 'prompts';
import type { Logger } from '@sap-ux/logger';
import { isAppStudio } from '@sap-ux/btp-utils';

/**
 * Replace calls to manifest.appdescr file if we are running the FLP embedded flow.
 *
 * @param bsp path of the BSP page
 * @returns a path rewrite function
 */
export function convertAppDescriptorToManifest(bsp: string): (path: string) => string {
    const regex = new RegExp('(' + bsp + '/manifest\\.appdescr\\b)');
    return (path: string) => (path.match(regex) ? '/manifest.json' : path);
}

/**
 * Prompts the user for credentials.
 *
 * @param log logger to report info to the user
 * @returns prompted user and password serialized for a basic auth header
 */
export async function promptUserPass(log: Logger): Promise<string | undefined> {
    if (isAppStudio()) {
        const { authNeeded } = await prompts([
            {
                type: 'confirm',
                name: 'authNeeded',
                message: `${cyan(i18n.t('info.authNeeded'))}\n\n`
            }
        ]);
        if (!authNeeded) {
            return undefined;
        }
    } else {
        log.info(yellow(i18n.t('info.credentialsRequiredForFLP')));
    }

    const { username, password } = await prompts(
        [
            {
                type: 'text',
                name: 'username',
                message: `${cyan(i18n.t('info.username'))}\n\n`,
                validate: (value): boolean | string => {
                    if (!value || !value.trim()) {
                        return `${i18n.t('error.emptyUsername')}`;
                    } else {
                        return true;
                    }
                }
            },
            {
                type: 'password',
                name: 'password',
                message: `${cyan(i18n.t('info.password'))}\n\n`,
                validate: (value): boolean | string => {
                    if (!value || !value.trim()) {
                        return `${i18n.t('error.emptyPassword')}`;
                    } else {
                        return true;
                    }
                }
            }
        ],
        {
            onCancel: () => {
                log.info(yellow(i18n.t('info.operationAborted')));
                return process.exit(1);
            }
        }
    );

    return `${username}:${password}`;
}

/**
 * Add additional options required for the special use case embedded FLP.
 *
 * @param bspPath path of the BSP hosting the app
 * @param proxyOptions existing http-proxy-middleware options
 * @param logger logger to report info to the user
 */
export async function addOptionsForEmbeddedBSP(bspPath: string, proxyOptions: Options, logger: Logger) {
    const regex = new RegExp('(' + bspPath + '/manifest\\.appdescr\\b)');
    proxyOptions.router = (req): string | undefined => {
        // redirects the request for manifest.appdescr to localhost
        if (req.path.match(regex)) {
            return req.protocol + '://' + req.headers.host;
        } else {
            return undefined;
        }
    };
    if (proxyOptions.pathRewrite) {
        const oldRewrite = proxyOptions.pathRewrite as (path: string) => string;
        const appDescrRewrite = convertAppDescriptorToManifest(bspPath);
        proxyOptions.pathRewrite = (path: string) => appDescrRewrite(oldRewrite(path));
    } else {
        proxyOptions.pathRewrite = convertAppDescriptorToManifest(bspPath);
    }

    if (!proxyOptions.auth) {
        proxyOptions.auth = await promptUserPass(logger);
    }
}
