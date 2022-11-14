import type { AbapServiceProvider } from '@sap-ux/axios-extension';
import { TransportChecksService } from '@sap-ux/axios-extension';
import type { ResultMessage } from '../types';
import { getLogger } from '../logger';
import { t } from '../i18n';

/**
 * Checks if ATO catalog is available.
 *
 * @param provider the AbapServiceProvider to be used
 * @returns Result messages and result of ato catalog request
 */
export async function checkAtoCatalog(
    provider: AbapServiceProvider
): Promise<{ messages: ResultMessage[]; isAtoCatalog: boolean }> {
    const logger = getLogger();
    let isAtoCatalog = false;
    try {
        const atoInfo = await provider.getAtoInfo();
        if (Object.keys(atoInfo).length) {
            isAtoCatalog = true;
            logger.info(t('info.atoCatalogAvailable'));
        } else {
            logger.warn(t('warning.atoCatalogNotAvailable'));
        }
    } catch (e) {
        logger.error(t('error.atoCatalogError'));
        logger.debug(e.message);
    }
    return {
        messages: logger.getMessages(),
        isAtoCatalog
    };
}

/**
 * Checks for an existing instance of the UI5 ABAP repository service or creates one.
 *
 * @param provider the AbapServiceProvider to be used
 * @returns Result messages and result of the request
 */
export async function checkUi5AbapRepository(
    provider: AbapServiceProvider
): Promise<{ messages: ResultMessage[]; isSapUi5Repo: boolean }> {
    const logger = getLogger();
    let isSapUi5Repo = false;
    try {
        const sapUI5Repo = provider.getUi5AbapRepository();
        if (Object.keys(sapUI5Repo).length) {
            isSapUi5Repo = true;
            logger.info(t('info.sapUI5RepoAvailable'));
        } else {
            logger.warn(t('warning.sapUI5RepoNotAvailable'));
        }
    } catch (e) {
        logger.error(t('error.sapUI5RepoError'));
        logger.debug(e.message);
    }
    return {
        messages: logger.getMessages(),
        isSapUi5Repo
    };
}

/**
 * Checks for the ability to retrieve available transport requests.
 *
 * @param provider the AbapServiceProvider to be used
 * @returns Result messages and result of the request
 */
export async function checkTransportRequests(
    provider: AbapServiceProvider
): Promise<{ messages: ResultMessage[]; isTransportRequests: boolean }> {
    const logger = getLogger();
    let isTransportRequests = false;
    try {
        const adtService = await provider.getAdtService<TransportChecksService>(TransportChecksService);
        if (typeof adtService?.getTransportRequests === 'function') {
            isTransportRequests = true;
            logger.info(t('info.getTransportRequestsAvailable'));
        } else {
            logger.warn(t('warning.getTransportRequestsoNotAvailable'));
        }
    } catch (e) {
        logger.error(t('error.getTransportRequestsError'));
        logger.debug(e.message);
    }
    return {
        messages: logger.getMessages(),
        isTransportRequests
    };
}
