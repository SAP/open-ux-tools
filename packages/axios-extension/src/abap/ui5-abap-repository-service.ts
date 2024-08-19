import { type AxiosResponse, type AxiosRequestConfig } from 'axios';
import { logError, getErrorMessageFromString, prettyPrintError, prettyPrintMessage } from './message';
import { ODataService } from '../base/odata-service';
import { isAxiosError } from '../base/odata-request-error';
/**
 * Required configuration a transportable object.
 */
export interface TransportConfig {
    /**
     * Optional package for the ABAP development object
     */
    package?: string;

    /**
     * Optional transport request to record the changes
     */
    transport?: string;
}

/**
 * Required configuration for the BSP hosting an app.
 */
export interface BspConfig extends TransportConfig {
    /**
     * Name of the BSP, additionally, the last part of the exposed service path
     */
    name: string;

    /**
     * Optional description of the ABAP development object representing the BSP
     */
    description?: string;
}

/**
 * Configuration required for deploying an app.
 */
export interface DeployConfig {
    /**
     * archive zip archive containing the application files as buffer
     */
    archive: Buffer;
    /**
     * app application configuration
     */
    bsp: BspConfig;
    /**
     * if set to true, all requests will be sent, the service checks them, but no actual deployment will happen
     */
    testMode?: boolean;
    /**
     * if set then the SafeMode url parameter will be set. SafeMode is by default active, to deactivate provide false
     */
    safeMode?: boolean;
}

/**
 * Configuration required for undeploying an app.
 */
export interface UndeployConfig {
    bsp: Pick<BspConfig, 'name' | 'transport'>;
    testMode?: DeployConfig['testMode'];
}

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

export const abapUrlReplaceMap = new Map([
    [/\.abap\./, '.abap-web.'],
    [/-api\.s4hana\.ondemand\.com/, '.s4hana.ondemand.com'],
    [/-api\.saps4hanacloud\.cn/, '.saps4hanacloud.cn']
]);

const xmlReplaceMap = {
    '&': '&amp;',
    '"': '&quot;',
    "'": '&apos;',
    '<': '&lt;',
    '>': '&gt;'
};
const xmlReplaceRegex = /[<>&"']/g;

/**
 * Escape invalid characters for XML values.
 *
 * @param xmlValue xml string
 * @returns escaped xml value
 */
function encodeXmlValue(xmlValue: string): string {
    return xmlValue.replace(xmlReplaceRegex, (c) => xmlReplaceMap[c]);
}

/**
 * Extension of the generic OData client simplifying the consumption of the UI5 repository service
 */
export class Ui5AbapRepositoryService extends ODataService {
    public static readonly PATH = '/sap/opu/odata/UI5/ABAP_REPOSITORY_SRV';
    private readonly publicUrl: string;
    private readonly isDest: boolean;

    /**
     * Extension of the base constructor to set preferred response format if not provided by caller.
     *
     * @param config optional base configuration for Axios appended with optional fields
     */
    public constructor(config?: AxiosRequestConfig & { publicUrl?: string }) {
        config = config ?? {};
        config.headers = config.headers ?? {};
        // @see https://axios-http.com/docs/config_defaults
        config.headers['Accept'] = config.headers['Accept'] ?? 'application/json,application/xml,text/plain,*/*';
        super(config);
        this.publicUrl = config.publicUrl || this.defaults.baseURL;
        this.isDest = /\.dest\//.test(this.defaults.baseURL);
    }

    /**
     * Get information about a deployed application. Returns undefined if the application cannot be found.
     *
     * @param app application id (BSP application name)
     * @returns application information or undefined
     */
    public async getInfo(app: string): Promise<AppInfo> {
        try {
            const response = await this.get<AppInfo>(`/Repositories('${encodeURIComponent(app)}')`);
            return response.odata();
        } catch (error) {
            this.log.debug(`Retrieving application ${app} from ${Ui5AbapRepositoryService.PATH}, ${error}`);
            if (isAxiosError(error) && error.response?.status === 404) {
                return undefined;
            }
            throw error;
        }
    }

    /**
     * Get the application files as zip archive. This will only work on ABAP systems 2308 or newer.
     *
     * @param app application id (BSP application name)
     * @returns undefined if no app is found or downloading files is not supported, otherwise return the application files as a buffer.
     */
    public async downloadFiles(app: string): Promise<Buffer> {
        try {
            const response = await this.get<AppInfo>(`/Repositories('${encodeURIComponent(app)}')`, {
                params: {
                    CodePage: 'UTF8',
                    DownloadFiles: 'RUNTIME'
                }
            });
            const data = response.odata();
            return data.ZipArchive ? Buffer.from(data.ZipArchive) : undefined;
        } catch (error) {
            this.log.debug(`Retrieving application ${app}, ${error}`);
            if (isAxiosError(error) && error.response?.status === 404) {
                return undefined;
            }
            throw error;
        }
    }

    /**
     * Deploy the given archive either by creating a new BSP or updating an existing one.
     *
     * @param config deployment config
     * @param config.archive zip archive containing the application files as buffer
     * @param config.bsp BSP configuration
     * @param config.testMode if set to true, all requests will be sent, the service checks them, but no actual deployment will happen
     * @param config.safeMode if set then the SafeMode url parameter will be set. SafeMode is by default active, to activate provide false
     * @returns the Axios response object for further processing
     */
    public async deploy({ archive, bsp, testMode = false, safeMode }: DeployConfig): Promise<AxiosResponse> {
        const info: AppInfo = await this.getInfo(bsp.name);
        const payload = this.createPayload(
            archive,
            bsp.name,
            bsp.description || 'Deployed with SAP Fiori tools',
            info ? info.Package : bsp.package
        );
        this.log.debug(
            `Payload:\n ID: ${this.publicUrl}/Repositories('${bsp.name}') \n ABAP Package: ${
                info ? info.Package : bsp.package
            }`
        );
        const config = this.createConfig(bsp.transport, testMode, safeMode);
        const frontendUrl = this.getAbapFrontendUrl();
        try {
            const response: AxiosResponse | undefined = await this.updateRepoRequest(!!info, bsp.name, payload, config);
            // An app can be successfully deployed after a timeout exception, no value in showing exception headers
            if (response?.headers?.['sap-message']) {
                prettyPrintMessage({
                    msg: response.headers['sap-message'],
                    log: this.log,
                    host: frontendUrl,
                    isDest: this.isDest
                });
            }
            if (!testMode) {
                // log url of created/updated app
                const path = '/sap/bc/ui5_ui5' + (!bsp.name.startsWith('/') ? '/sap/' : '') + bsp.name.toLowerCase();
                const query = this.defaults.params?.['sap-client']
                    ? '?sap-client=' + this.defaults.params['sap-client']
                    : '';
                this.log.info(`App available at ${frontendUrl}${path}${query}`);
            } else {
                // Test mode returns a HTTP response code of 403 so we dont want to show all error messages
                prettyPrintError(
                    {
                        error: getErrorMessageFromString(response?.data),
                        log: this.log,
                        host: frontendUrl,
                        isDest: this.isDest
                    },
                    false
                );
            }
            return response;
        } catch (error) {
            logError({ error, host: frontendUrl, log: this.log, isDest: this.isDest });
            throw error;
        }
    }

    /**
     * Undeploy an existing app.
     *
     * @param config undeploy config
     * @param config.bsp BSP configuration
     * @param config.testMode if set to true, all requests will be sent, the service checks them, but no actual deployment will happen
     * @returns the Axios response object for further processing or undefined if no request is sent
     */
    public async undeploy({ bsp, testMode = false }: UndeployConfig): Promise<AxiosResponse | undefined> {
        const config = this.createConfig(bsp.transport, testMode);
        const host = this.getAbapFrontendUrl();

        const info: AppInfo = await this.getInfo(bsp.name);
        try {
            if (info) {
                const response = await this.deleteRepoRequest(bsp.name, config);
                if (response?.headers?.['sap-message']) {
                    prettyPrintMessage({
                        msg: response.headers['sap-message'],
                        log: this.log,
                        host,
                        isDest: this.isDest
                    });
                }
                return response;
            } else {
                this.log.warn(`Application ${bsp.name} not found, nothing to undeploy.`);
                return undefined;
            }
        } catch (error) {
            logError({ error, host, log: this.log });
            throw error;
        }
    }

    /**
     * Translate the technical ABAP on BTP URL to the frontend URL.
     *
     * @returns url to be used in the browser.
     */
    protected getAbapFrontendUrl(): string {
        const url = new URL(this.publicUrl);
        abapUrlReplaceMap.forEach((value, key) => {
            url.hostname = url.hostname.replace(key, value);
        });
        return `${url.protocol}//${url.host}`;
    }

    /**
     * Internal helper method to generate a request configuration (headers, parameters).
     *
     * @param transport optional transport request id
     * @param testMode optional url parameter to enable test mode
     * @param safeMode optional url parameter to disable the safe model (safemode=false)
     * @returns the Axios response object for further processing
     */
    protected createConfig(transport?: string, testMode?: boolean, safeMode?: boolean): AxiosRequestConfig {
        const headers = {
            'Content-Type': 'application/atom+xml',
            type: 'entry',
            charset: 'UTF8'
        };
        const params: { [key: string]: string | boolean } = {
            CodePage: `'UTF8'`,
            CondenseMessagesInHttpResponseHeader: 'X',
            format: 'json'
        };
        if (transport) {
            params.TransportRequest = transport;
        }

        if (testMode) {
            params.TestMode = true;
        }
        if (safeMode !== undefined) {
            params.SafeMode = safeMode;
        }

        // `axios` does not properly pass the default values of `maxBodyLength` and `maxContentLength`
        // to `follow-redirects`: https://github.com/axios/axios/issues/4263
        // Without this `follow-redirects` limits the max body length to 10MB and fails with the following
        // message: “Request body larger than maxBodyLength limit”.
        // Set both to infinity. It's the backend's responsibilty to reject messages sizes it cannot handle
        const maxBodyLength = Infinity;
        const maxContentLength = Infinity;

        return { headers, params, maxBodyLength, maxContentLength };
    }

    /**
     * Create the request payload for a deploy request.
     *
     * @param archive archive as buffer
     * @param name application name
     * @param description description for the deployed app
     * @param abapPackage ABAP package containing the app
     * @returns XML based request payload
     */
    protected createPayload(archive: Buffer, name: string, description: string, abapPackage: string): string {
        const base64Data = archive.toString('base64');
        const time = new Date().toISOString();
        const escapedName = encodeXmlValue(name);
        return (
            `<entry xmlns="http://www.w3.org/2005/Atom"` +
            `       xmlns:m="http://schemas.microsoft.com/ado/2007/08/dataservices/metadata"` +
            `       xmlns:d="http://schemas.microsoft.com/ado/2007/08/dataservices"` +
            `       xml:base="${this.publicUrl}">` +
            `  <id>${this.publicUrl}/Repositories('${escapedName}')</id>` +
            `  <title type="text">Repositories('${escapedName}')</title>` +
            `  <updated>${time}</updated>` +
            `  <category term="/UI5/ABAP_REPOSITORY_SRV.Repository" scheme="http://schemas.microsoft.com/ado/2007/08/dataservices/scheme"/>` +
            `  <link href="Repositories('${escapedName}')" rel="edit" title="Repository"/>` +
            `  <content type="application/xml">` +
            `    <m:properties>` +
            `      <d:Name>${escapedName}</d:Name>` +
            `      <d:Package>${abapPackage?.toUpperCase()}</d:Package>` +
            `      <d:Description>${encodeXmlValue(description)}</d:Description>` +
            `      <d:ZipArchive>${base64Data}</d:ZipArchive>` +
            `      <d:Info/>` +
            `    </m:properties>` +
            `  </content>` +
            `</entry>`
        );
    }

    /**
     * Send a request to the backed to create or update an application.
     *
     * @param isExisting app has already been deployed
     * @param appName application name
     * @param payload request payload
     * @param config additional request config
     * @param tryCount number of attempted deploys (sometimes a repo request fails with a known timeout issue, so we retry)
     * @returns the Axios response object for further processing
     */
    protected async updateRepoRequest(
        isExisting: boolean,
        appName: string,
        payload: string,
        config: AxiosRequestConfig,
        tryCount = 1
    ): Promise<AxiosResponse | undefined> {
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
                return Promise.resolve(undefined);
            } else {
                this.log.info(`${appName} found on target system: ${isExisting}`);
                const response = isExisting
                    ? await this.put(`/Repositories('${encodeURIComponent(appName)}')`, payload, config)
                    : await this.post('/Repositories', payload, config);
                return response;
            }
        } catch (error) {
            // Known ABAP timeout exception codes should re-trigger a deployment again to confirm the app was deployed
            if ([504, 408].includes(error?.response?.status)) {
                // Kill the flow after three attempts
                if (tryCount >= 3) {
                    throw error;
                }
                return this.updateRepoRequest(isExisting, appName, payload, config, tryCount + 1);
            } else if (config?.params?.TestMode) {
                // TestMode returns HTTP 403 but includes details of the uploaded files and request
                return error.response;
            } else {
                throw error;
            }
        }
    }

    /**
     * Send a request to the backend to delete an application.
     *
     * @param appName application name
     * @param config additional request config
     * @param tryCount number of attempted deploys (sometimes a repo request fails with a known timeout issue, so we retry)
     * @returns the Axios response object for further processing
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
            return await this.delete(`/Repositories('${encodeURIComponent(appName)}')`, config);
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
}
