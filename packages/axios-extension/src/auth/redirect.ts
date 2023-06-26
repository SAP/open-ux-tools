/**
 * Class representing a local OAuth redirect listener.
 */
export class Redirect {
    public static readonly path = '/oauth/client/redirect';
    private readonly port: number;

    /**
     * Constructor with a port number.
     *
     * @param port port on which the redirect service is listening.
     */
    constructor(port: number) {
        this.port = port;
    }

    /**
     * Get the url for the redirect service.
     *
     * @returns a string representing the redirect url.
     */
    public url(): string {
        return `http://localhost:${this.port}${Redirect.path}`;
    }
}
