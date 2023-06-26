/**
 *
 */
export class ABAPSystem {
    private apiURL: URL;
    private uiURL: URL;
    private systemURL: URL;

    /**
     *
     * @param backendUrl backend Url
     */
    constructor(backendUrl: string) {
        this.systemURL = new URL(backendUrl);
    }
    /**
     * Removes any `-api` suffix in the first label of the hostname.
     *
     * @returns UI hostname
     */
    uiHostname(): string {
        if (!this.uiURL) {
            this.uiURL = new URL(this.systemURL.href);

            const [first, ...rest] = this.uiURL.hostname.split('.');
            this.uiURL.hostname = [first.replace(/-api$/, ''), ...rest].join('.');
        }
        return this.uiURL.origin;
    }

    /**
     * Adds a `-api` suffix to the first label of the hostname.
     *
     * @returns API hostname
     */
    apiHostname(): string {
        if (!this.apiURL) {
            this.apiURL = new URL(this.systemURL.href);

            const [first, ...rest] = this.apiURL.hostname.split('.');
            if (!first.endsWith('-api')) {
                this.apiURL.hostname = [first + '-api', ...rest].join('.');
            }
        }
        return this.apiURL.origin;
    }

    /**
     *
     * @returns logoff URL
     */
    logoffUrl(): string {
        return this.uiHostname() + '/sap/public/bc/icf/logoff';
    }
}
