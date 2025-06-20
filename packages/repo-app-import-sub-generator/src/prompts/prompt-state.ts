import AdmZip from 'adm-zip';
import { DatasourceType, type OdataServiceAnswers } from '@sap-ux/odata-service-inquirer';

/**
 * Much of the values returned by the app downloader prompting are derived from prompt answers and are not direct answer values.
 * Since inquirer does not provide a way to return values that are not direct answers from prompts, this class will maintain the derived values
 * across prompts statically for the lifespan of the prompting session.
 *
 */
export class PromptState {
    private static _systemSelection: OdataServiceAnswers = { datasourceType: DatasourceType.sapSystem };
    private static _admZipInstance?: AdmZip;

    /**
     * Returns the current state of the service config.
     *
     * @returns {SystemSelectionAnswers} service config
     */
    public static get systemSelection(): OdataServiceAnswers {
        return this._systemSelection;
    }

    /**
     * Set the state of the system selection.
     *
     * @param {OdataServiceAnswers} value - system selection value
     */
    public static set systemSelection(value: Partial<OdataServiceAnswers>) {
        this._systemSelection = value as OdataServiceAnswers; // NOSONAR
    }

    /**
     * Set the downloaded app package.
     */
    public static set admZip(archive: Buffer) {
        this._admZipInstance = new AdmZip(archive);
    }

    /**
     * Returns the AdmZip instance created from the downloaded archive.
     *
     * @returns {admZip | undefined} admZip instance
     */
    public static get admZip(): AdmZip | undefined {
        return this._admZipInstance;
    }

    /**
     * Get the baseURL from the connected system's service provider defaults.
     *
     * @returns {string | undefined} baseURL
     */
    public static get baseURL(): string | undefined {
        return (
            this._systemSelection.connectedSystem?.backendSystem?.url ??
            this._systemSelection.connectedSystem?.destination?.Host
        );
    }

    /**
     * Get the sap-client parameter from the connected system's service provider defaults.
     *
     * @returns {string | undefined} sap-client
     */
    public static get sapClient(): string | undefined {
        return (
            this._systemSelection.connectedSystem?.backendSystem?.client ??
            this._systemSelection.connectedSystem?.destination?.['sap-client']
        );
    }

    /**
     * Get the destination parameter from the connected system's service provider defaults.
     *
     * @returns {string | undefined} sap-client
     */
    public static get destinationName(): string | undefined {
        return this._systemSelection.connectedSystem?.destination?.Name;
    }

    static reset(): void {
        PromptState.systemSelection = {};
        PromptState._admZipInstance = undefined;
    }
}
