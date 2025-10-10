import { yellow, cyan } from 'chalk';
import type { Options } from 'http-proxy-middleware';
import i18n from 'i18next';
import prompts from 'prompts';
import type { Logger } from '@sap-ux/logger';
import { isAppStudio } from '@sap-ux/btp-utils';
import type { IncomingMessage } from 'node:http';
import type { Request } from 'express';

/**
 * Prompts the user for credentials.
 *
 * @param log logger to report info to the user
 * @returns prompted user and password serialized for a basic auth header
 */
export async function promptUserPass(log: Logger): Promise<string | undefined> {
    if (isAppStudio()) {
        const { authNeeded } = (await prompts([
            {
                type: 'confirm',
                name: 'authNeeded',
                message: `${cyan(i18n.t('info.authNeeded'))}\n\n`
            }
        ])) as { authNeeded: boolean };
        if (!authNeeded) {
            return undefined;
        }
    } else {
        log.info(yellow(i18n.t('info.credentialsRequiredForFLP')));
    }

    const { username, password } = (await prompts(
        [
            {
                type: 'text',
                name: 'username',
                message: `${cyan(i18n.t('info.username'))}\n\n`,
                validate: (value): boolean | string => {
                    if (!value?.trim()) {
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
                    if (!value?.trim()) {
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
    )) as { username: string; password: string };

    return `${username}:${password}`;
}

/**
 * Add additional options required for the special use case embedded FLP.
 *
 * @param bspPath path of the BSP hosting the app
 * @param proxyOptions existing http-proxy-middleware options
 * @param logger logger to report info to the user
 */
export async function addOptionsForEmbeddedBSP(bspPath: string, proxyOptions: Options, logger: Logger): Promise<void> {
    const regex = new RegExp('(' + bspPath + '/manifest\\.appdescr\\b)', 'i');
    proxyOptions.router = (req: IncomingMessage | Request): string | undefined => {
        // redirects the request for manifest.appdescr to localhost
        if (req.url?.match(regex)) {
            const protocol =
                'protocol' in req
                    ? req.protocol
                    : req.headers.referer?.substring(0, req.headers.referer.indexOf(':')) ?? 'http';
            return protocol + '://' + req.headers.host;
        } else {
            return undefined;
        }
    };

    if (!proxyOptions.auth) {
        proxyOptions.auth = await promptUserPass(logger);
    }
}
