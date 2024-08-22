import type { SystemInfo } from '@sap-ux/axios-extension';
import { AdtCatalogService, UI5RtVersionService } from '@sap-ux/axios-extension';
import { AbapProvider, ApplicationManager } from '../../../../client';
import type { FlexUISupportedSystem } from '../../../../types';

/**
 * Client for managing all consumed requests to an ABAP system in config questions.
 */
export class ConfigClient {
    private static instance: ConfigClient | undefined;
    private appsManager: ApplicationManager;

    /**
     * Constructs an instance of ConfigClient.
     *
     * @param {AbapProvider} abapProvider - The ABAP Provider handling the connection with the system.
     * @param {boolean} isCustomerBase - whether layer is CUSTOMER_BASE
     */
    private constructor(private abapProvider: AbapProvider, private isCustomerBase: boolean) {}

    /**
     * Creates an instance of ConfigClient.
     *
     * @param {AbapProvider} abapProvider - The ABAP Provider handling the connection with the system.
     * @param {boolean} isCustomerBase - whether layer is CUSTOMER_BASE
     * @param {string} system - The system identifier.
     * @param {string} [client] - The client, if applicable.
     * @param {string} [username] - The username for authentication.
     * @param {string} [password] - The password for authentication.
     * @returns {ConfigClient} instance of config client
     */
    public static async getInstance(
        abapProvider: AbapProvider,
        isCustomerBase: boolean,
        system: string,
        client?: string,
        username?: string,
        password?: string
    ): Promise<ConfigClient> {
        if (!this.instance) {
            this.instance = new ConfigClient(abapProvider, isCustomerBase);
            await this.instance.connectToAbapServiceProvider(system, client, username, password);
            this.instance.appsManager = new ApplicationManager(abapProvider, true);
        }

        return this.instance;
    }

    public getApplicationManager(): ApplicationManager {
        return this.appsManager;
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
     * @returns {SystemInfo} system into containing system supported adaptation project types and translations.
     */
    public async getSystemInfo(): Promise<SystemInfo> {
        const provider = this.abapProvider.getProvider();
        const lrep = provider.getLayeredRepository();
        return lrep.getSystemInfo();
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

    public static resetInstance(): void {
        this.instance = undefined;
    }

    /**
     * Configures the ABAP service provider using the specified system details and credentials if needed.
     *
     * @param {string} system - The system identifier.
     * @param {string} [client] - The client, if applicable.
     * @param {string} [username] - The username for authentication.
     * @param {string} [password] - The password for authentication.
     */
    private async connectToAbapServiceProvider(
        system: string,
        client?: string,
        username?: string,
        password?: string
    ): Promise<void> {
        await this.abapProvider.setProvider(system, client, username, password);
    }
}
