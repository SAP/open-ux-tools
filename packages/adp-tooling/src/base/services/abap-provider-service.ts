import { AbapServiceProvider, AxiosRequestConfig, ProviderConfiguration } from '@sap-ux/axios-extension';
import { isAppStudio } from '@sap-ux/btp-utils';
import { Logger } from '@sap-ux/logger';
import { AuthenticationType } from '@sap-ux/store';
import {
    getCredentialsFromStore,
    createAbapServiceProvider,
    DestinationAbapTarget,
    UrlAbapTarget
} from '@sap-ux/system-access';
import { AbapTarget } from '@sap-ux/ui5-config';
import { EndpointsService } from './endpoints-service';

export class ProviderService {
    private provider: AbapServiceProvider;

    constructor(private endpointsService: EndpointsService) {}

    public getProvider() {
        return this.provider;
    }

    public async setProvider(system: string, client?: string, username?: string, password?: string) {
        let target: AbapTarget;

        const requestOptions: AxiosRequestConfig & Partial<ProviderConfiguration> = {
            ignoreCertErrors: false
        };

        if (isAppStudio()) {
            target = {
                destination: system
            };
        } else {
            const details = this.endpointsService.getSystemDetails(system);

            target = {
                url: details?.url,
                client: details?.client ?? client
            } as AbapTarget;

            const storedSystem = await getCredentialsFromStore(
                { url: details?.url ?? system, client: details?.client },
                {} as Logger
            );

            if (storedSystem?.username && storedSystem?.password) {
                requestOptions.auth = { username: storedSystem?.username, password: storedSystem?.password };
            }

            if (storedSystem?.authenticationType === AuthenticationType.ReentranceTicket) {
                target.authenticationType = AuthenticationType.ReentranceTicket;
            }
        }

        if (username && password) {
            requestOptions.auth = { username, password };
        }

        this.provider = await createAbapServiceProvider(target, requestOptions, false, {} as Logger);
    }
}
