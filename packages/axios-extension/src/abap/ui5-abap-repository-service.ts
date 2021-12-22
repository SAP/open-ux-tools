import { AxiosResponse, AxiosRequestConfig, AxiosError } from 'axios';
import { readFileSync } from 'fs';
import { prettyPrintError, prettyPrintMessage } from './message';
import { ODataService } from '../base/odata-service';

/**
 * Application information object returned by the UI5 Repository service
 */
export interface AppInfo {
    Name: string;
    Package: string;
    Description?: string;
    Info?: string;
    ZipArchive?: string;
}

/**
 * Required configuration to deploy an application using the UI5 Repository service.
 */
export interface ApplicationConfig {
    name: string;
    description?: string;
    package?: string;
    transport?: string;
}

export const abapUrlReplaceMap = new Map([
    [/\.abap\./, '.abap-web.'],
    [/-api.s4hana.ondemand.com/, '.s4hana.ondemand.com'],
    [/-api.saps4hanacloud.cn/, '.saps4hanacloud.cn']
]);

/**
 * Extension of the generic OData client simplifying the consumption of the UI5 repository service
 */
export class Ui5AbapRepositoryService extends ODataService {
    public static readonly PATH = '/sap/opu/odata/UI5/ABAP_REPOSITORY_SRV';

    /**
     * Get information about a deployed application. Returns undefined if the application cannot be found.
     *
     * @param app application id (BSP application name)
     */
    public async getInfo(app: string): Promise<AppInfo> {
        try {
            const response = await this.get<AppInfo>(`/Repositories('${encodeURIComponent(app)}')`);
            return response.odata();
        } catch (error) {
            return undefined;
        }
    }

    /**
     * Deploy the given archive either by creating a new BSP or updating an existing one
     *
     * @param archivePath path to a zip archive containing the application files
     * @param app application configuration
     * @param testMode if set to true, all requests will be sent, the service checks them, but no actual deployment will happen
     */
    public async deploy(archivePath: string, app: ApplicationConfig, testMode = false): Promise<AxiosResponse> {
        const info: AppInfo = await this.getInfo(app.name);
        const payload = this.createPayload(
            archivePath,
            app.name,
            app.description || 'Deployed with SAP Fiori tools',
            info ? info.Package : app.package
        );
        const config = this.createConfig(app.transport, testMode);
        try {
            const response: AxiosResponse | undefined = await this.updateRepoRequest(!!info, app.name, payload, config);
            // An app can be successfully deployed after a timeout exception, no value in showing exception headers
            if (response?.headers?.['sap-message']) {
                const message = JSON.parse(response.headers['sap-message']);
                const frontendUrl = this.getAbapFrontendUrl(this.defaults.baseURL);
                prettyPrintMessage(message, this.log, frontendUrl);

                // log url of created/updated app
                const path = '/sap/bc/ui5_ui5' + (!app.name.startsWith('/') ? '/sap/' : '') + app.name.toLowerCase();
                const query = this.defaults.params['sap-client']
                    ? '?sap-client=' + this.defaults.params['sap-client']
                    : '';
                this.log.info(`App available at ${frontendUrl}${path}${query}`);
            }

            return response;
        } catch (error) {
            this.logError(error);
            throw error;
        }
    }

    /**
     * @param app
     * @param testMode
     */
    public async undeploy(app: ApplicationConfig, testMode = false): Promise<AxiosResponse> {
        const config = this.createConfig(app.transport, testMode);

        try {
            const response = await this.deleteRepoRequest(app.name, config);
            if (response?.headers?.['sap-message']) {
                const message = JSON.parse(response.headers['sap-message']);
                prettyPrintMessage(message, this.log);
            }
            return response;
        } catch (error) {
            this.logError(error);
            throw error;
        }
    }

    /**
     * Translate the technical ABAP on BTP URL to the frontend URL
     *
     * @param technicalUrl Technical URL of the ABAP system from service keys
     */
    protected getAbapFrontendUrl(technicalUrl: string): string {
        abapUrlReplaceMap.forEach((value, key) => {
            technicalUrl = technicalUrl.replace(key, value);
        });
        return technicalUrl;
    }

    /**
     * Internal helper method to generate a request configuration (headers, parameters)
     *
     * @param transport optional transport request id
     * @param testMode test mode enabled or not
     */
    protected createConfig(transport?: string, testMode?: boolean): AxiosRequestConfig {
        const headers = {
            'Content-Type': 'application/atom+xml',
            type: 'entry',
            charset: 'UTF8'
        };
        const params: { [key: string]: string | boolean } = {
            CodePage: "'UTF8'",
            CondenseMessagesInHttpResponseHeader: 'X',
            format: 'json'
        };
        if (transport) {
            params.TransportRequest = transport;
        }
        if (testMode) {
            params.TestMode = true;
        }

        return { headers, params };
    }

    /**
     * Create the request payload for a deploy request
     *
     * @param archive archive file path
     * @param name application name
     * @param description description for the deployed app
     * @param abapPackage ABAP package containing the app
     */
    protected createPayload(archive: string, name: string, description: string, abapPackage: string): string {
        const base64Data = readFileSync(archive, { encoding: 'base64' });
        const time = new Date().toISOString();
        return (
            `<entry xmlns="http://www.w3.org/2005/Atom"` +
            `       xmlns:m="http://schemas.microsoft.com/ado/2007/08/dataservices/metadata"` +
            `       xmlns:d="http://schemas.microsoft.com/ado/2007/08/dataservices"` +
            `       xml:base="${this.defaults.baseURL}">` +
            `  <id>${this.defaults.baseURL}/Repositories('${name}')</id>` +
            `  <title type="text">Repositories('${name}')</title>` +
            `  <updated>${time}</updated>` +
            `  <category term="/UI5/ABAP_REPOSITORY_SRV.Repository" scheme="http://schemas.microsoft.com/ado/2007/08/dataservices/scheme"/>` +
            `  <link href="Repositories('${name}')" rel="edit" title="Repository"/>` +
            `  <content type="application/xml">` +
            `    <m:properties>` +
            `      <d:Name>${name}</d:Name>` +
            `      <d:Package>${abapPackage?.toUpperCase()}</d:Package>` +
            `      <d:Description>${description}</d:Description>` +
            `      <d:ZipArchive>${base64Data}</d:ZipArchive>` +
            `      <d:Info/>` +
            `    </m:properties>` +
            `  </content>` +
            `</entry>`
        );
    }

    /**
     * Sometimes a repo request fails with a known timeout issue
     *
     * @param isExisting - app has already been deployed
     * @param appName
     * @param httpClient
     * @param payload
     * @param config
     * @param tryCount
     * @protected
     */
    protected async updateRepoRequest(
        isExisting: boolean,
        appName: string,
        payload: string,
        config: AxiosRequestConfig,
        tryCount = 1
    ): Promise<AxiosResponse> {
        try {
            // Was the app deployed after the first failed attempt?
            if (tryCount === 2) {
                this.log.warn(
                    'Warning: The application was deployed despite a time out response from the backend. Increasing the value of the HTML5.Timeout property for the destination may solve the issue'
                );
            }
            // If its already deployed, then dont try to create it again
            if (tryCount !== 1 && !isExisting && (await this.getInfo(appName)) !== undefined) {
                // We've nothing to return as we dont want to show the exception to the user!
                return;
            }
            return isExisting
                ? await this.put(`/Repositories('${encodeURIComponent(appName)}')`, payload, config)
                : await this.post('/Repositories', payload, config);
        } catch (error) {
            if (error?.response?.status === 504) {
                // Kill the flow after three attempts
                if (tryCount >= 3) {
                    throw error;
                }
                return this.updateRepoRequest(isExisting, appName, payload, config, tryCount + 1);
            } else {
                throw error;
            }
        }
    }

    /**
     * Sometimes a repo request fails with a known 400 bad request issue,
     * but succeeds in the retry
     *
     * @param appName
     * @param httpClient
     * @param config
     * @param tryCount
     * @protected
     */
    protected async deleteRepoRequest(
        appName: string,
        config: AxiosRequestConfig,
        tryCount = 1
    ): Promise<AxiosResponse> {
        try {
            if (tryCount === 2) {
                this.log.warn('Warning: retry undeploy to handle a backend rejection...');
            }
            return await this.delete(`/Repositories('${appName}')`, config);
        } catch (error) {
            if (error?.response?.status === 400) {
                // Kill the flow after 1 attempt
                if (tryCount >= 2) {
                    throw error;
                }
                return this.deleteRepoRequest(appName, config, tryCount + 1);
            } else {
                throw error;
            }
        }
    }

    /**
     * Log errors more user friendly if it is a standard Gateway error
     *
     * @param e error thrown by Axios after sending a request
     */
    protected logError(e: AxiosError): void {
        this.log.error(e.message);
        if (e.isAxiosError && e.response?.data?.['error']) {
            prettyPrintError(e.response.data['error'], this.log);
        }
    }
}
