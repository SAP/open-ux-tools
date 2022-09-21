import type {
    AbapServiceProvider,
    ProviderConfiguration,
    Ui5AbapRepositoryService,
    AxiosRequestConfig
} from '@sap-ux/axios-extension';
import { createForAbap, createForDestination, createForAbapOnCloud } from '@sap-ux/axios-extension';
import { isAppStudio } from '@sap-ux/btp-utils';
import { writeFileSync } from 'fs';
import { AbapDescriptor, AbapTarget } from '../types';

function createDeployService(target: AbapTarget): Ui5AbapRepositoryService {
    let provider: AbapServiceProvider;
    const options: AxiosRequestConfig & Partial<ProviderConfiguration> = {};
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

export function deploy(archive: Buffer, target: AbapTarget, app: AbapDescriptor, testMode?: boolean) {
    //const service = createDeployService(target);
    //service.deploy(archive, app, testMode);

    // for testing
    writeFileSync(`archive-${Date.now()}.zip`, archive);
}
