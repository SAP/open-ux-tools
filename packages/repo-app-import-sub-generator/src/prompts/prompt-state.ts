import type { SystemSelectionAnswers } from '../app/types';

/**
 * Much of the values returned by the app downloader prompting are derived from prompt answers and are not direct answer values.
 * Since inquirer does not provide a way to return values that are not direct answers from prompts, this class will maintain the derived values
 * across prompts statically for the lifespan of the prompting session.
 *
 */
export class PromptState {
    private static _systemSelection: SystemSelectionAnswers = {};
    private static _downloadedAppPackage?: Buffer;

    /**
     * Returns the current state of the service config.
     *
     * @returns {SystemSelectionAnswers} service config
     */
    public static get systemSelection(): SystemSelectionAnswers {
        return this._systemSelection;
    }

    /**
     * Set the state of the system selection.
     *
     * @param {SystemSelectionAnswers} value - system selection value
     */
    public static set systemSelection(value: Partial<SystemSelectionAnswers>) {
        this._systemSelection = value;
    }

    /**
     * Set the downloaded app package.
     */
    public static set downloadedAppPackage(archive: Buffer) {
        this._downloadedAppPackage = archive;
    }

    /**
     * Returns the downloaded app package.
     *
     * @returns {Buffer} downloaded app package
     */
    public static get downloadedAppPackage(): Buffer {
        return this._downloadedAppPackage ?? Buffer.alloc(0);
    }

    /**
     * Get the baseURL from the connected system's service provider defaults.
     *
     * @returns {string | undefined} baseURL
     */
    public static get baseURL(): string | undefined {
        return this._systemSelection.connectedSystem?.serviceProvider?.defaults?.baseURL;
    }

    /**
     * Get the sap-client parameter from the connected system's service provider defaults.
     *
     * @returns {string | undefined} sap-client
     */
    public static get sapClient(): string | undefined {
        return this._systemSelection.connectedSystem?.serviceProvider?.defaults?.params?.['sap-client'];
    }

    static reset(): void {
        PromptState.systemSelection = {};
        PromptState._downloadedAppPackage = undefined;
    }
}
