export class Redirect {
    public static readonly path = '/oauth/client/redirect';
    private readonly port: number;

    constructor(port: number) {
        this.port = port;
    }

    public url(): string {
        return `http://localhost:${this.port}${Redirect.path}`;
    }
}
