import type { SystemInfo } from '@sap-ux/axios-extension';
import {
    AdtCatalogService,
    UI5RtVersionService,
    ListPackageService,
    TransportChecksService
} from '@sap-ux/axios-extension';
import type { AbapProvider } from '../../../../client';
import type { FlexUISupportedSystem } from '../../../../types';

export const ABAP_PACKAGE_SEARCH_MAX_RESULTS = 50;
/**
 * Client for managing all consumed requests to an ABAP system in config questions.
 */
export class AbapClient {
    /**
     * Constructs an instance of ConfigClient.
     *
     * @param {AbapProvider} abapProvider - The ABAP Provider handling the connection with the system.
     * @param {boolean} isCustomerBase - whether layer is CUSTOMER_BASE
     */
    constructor(private abapProvider: AbapProvider, private isCustomerBase: boolean) {}

    /**
     * Function that connects provider to Abap system.
     *
     * @param {string} system - Abap system.
     * @param {string} client - Abap system client.
     * @param {string} username - username for authentication with Abap system.
     * @param {string} password - password for authentication with Abap system.
     */
    public async connectToSystem(system: string, client?: string, username?: string, password?: string): Promise<void> {
        if (
            !this.abapProvider.getIsConnected() ||
            (this.abapProvider.getSystem() && this.abapProvider.getSystem() !== system)
        ) {
            await this.abapProvider.setProvider(system, client, username, password);
        }
    }

    /**
     * Fetches system UI5 Version from UI5RtVersionService.
     *
     * @returns {string | undefined} system UI5 version
     */
    public async getSystemUI5Version(): Promise<string | undefined> {
        const provider = this.abapProvider.getProvider();
        const service = await provider.getAdtService<UI5RtVersionService>(UI5RtVersionService);
        const version = await service?.getUI5Version();

        return version;
    }

    /**
     * Fetches system information from the provider's layered repository.
     *
     * @param {string} language -  language for translations
     * @param {string} packageName - package name
     * @returns {SystemInfo} system into containing system supported adaptation project types and translations.
     */
    public async getSystemInfo(language?: string, packageName?: string): Promise<SystemInfo> {
        const provider = this.abapProvider.getProvider();
        const lrep = provider.getLayeredRepository();
        return lrep.getSystemInfo(language, packageName);
    }

    /**
     * Fetches system supports Flex UI features.
     *
     * @returns {Promise<FlexUISupportedSystem | undefined>} settings indicating support for onPremise and UI Flex capabilities.
     */
    public async getFlexUISupportedSystem(): Promise<FlexUISupportedSystem | undefined> {
        if (!this.isCustomerBase) {
            return {
                isOnPremise: true,
                isUIFlex: true
            };
        }
        const FILTER = {
            'scheme': 'http://www.sap.com/adt/categories/ui_flex',
            'term': 'dta_folder'
        };
        const acceptHeaders = {
            headers: {
                Accept: 'application/*'
            }
        };
        const provider = this.abapProvider.getProvider();
        const response = await provider.get(AdtCatalogService.ADT_DISCOVERY_SERVICE_PATH, acceptHeaders);

        return { isOnPremise: response.data.includes(FILTER.term), isUIFlex: response.data.includes(FILTER.scheme) };
    }

    /**
     * Queries an ABAP system for a list of packages based on a search phrase.
     *
     * @param {string} phrase - The search phrase used to filter the packages.
     * @returns {Promise<string[]>} A promise that resolves to an array of package names, or an empty array if none found or on error.
     */
    public async listPackages(phrase: string): Promise<string[]> {
        const provider = this.abapProvider.getProvider();
        const packageService = await provider.getAdtService<ListPackageService>(ListPackageService);
        const packages = await packageService?.listPackages({ maxResults: ABAP_PACKAGE_SEARCH_MAX_RESULTS, phrase });
        return packages ?? [];
    }

    /**
     * Fetches a list of transport requests for a given package and repository using a specified ABAP service provider.
     *
     * @param {string} packageName - The name of the package for which transport requests are being fetched.
     * @param {string} repository - The repository associated with the package.
     * @returns {Promise<string[]>} A promise that resolves to an array of transport request numbers.
     */
    public async listTransports(packageName: string, repository: string): Promise<string[]> {
        const provider = this.abapProvider.getProvider();
        const transportCheckService = await provider.getAdtService<TransportChecksService>(TransportChecksService);
        const transportRequests = await transportCheckService?.getTransportRequests(packageName, repository);
        return transportRequests?.map((transport) => transport.transportNumber) ?? [];
    }
}
