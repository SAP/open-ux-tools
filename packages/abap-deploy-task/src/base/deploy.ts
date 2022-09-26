import type {
    AbapServiceProvider,
    ProviderConfiguration,
    Ui5AbapRepositoryService,
    AxiosRequestConfig
} from '@sap-ux/axios-extension';
import { createForAbap, createForDestination } from '@sap-ux/axios-extension';
import { isAppStudio } from '@sap-ux/btp-utils';
import { writeFileSync } from 'fs';
import type { AbapDescriptor, AbapTarget, CommonOptions } from '../types';

/**
 * Create an instance of a UI5AbapRepository service connected to the given target configuration.
 *
 * @param target - target system for the deployments
 * @returns service instance
 */
function _createDeployService(target: AbapTarget, config: CommonOptions): Ui5AbapRepositoryService {
    let provider: AbapServiceProvider;
    const options: AxiosRequestConfig & Partial<ProviderConfiguration> = {};
    if (config.strictSsl === false) {
        options.ignoreCertErrors = true;
    }
    if (isAppStudio() && target.destination) {
        provider = createForDestination(options, {
            Name: target.destination
        }) as AbapServiceProvider;
    } else if (target.url) {
        if (target.scp) {
            // TODO: read service info from store
            throw new Error('TODO');
            //provider = createForAbapOnCloud({
            //    url: target.url,
            //});
        } else {
            options.baseURL = target.url;
            if (target.client) {
                options.params = { 'sap-client': target.client };
            }
            provider = createForAbap(options);
        }
    } else {
        throw new Error();
    }
    return provider.getUi5AbapRepository();
}

/**
 * Deploy the given archive to the given target using the given app description.
 *
 * @param archive
 * @param target
 * @param app
 * @param testMode - if set to true then only a test deployment is executed without deploying the actual archive in the backend
 */
export function deploy(archive: Buffer, target: AbapTarget, app: AbapDescriptor, testMode?: boolean) {
    //const service = createDeployService(target);
    //service.deploy(archive, app, testMode);
    // for testing
    if (!testMode) {
        writeFileSync(`archive-${Date.now()}.zip`, archive);
    }
}
