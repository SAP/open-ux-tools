// Manual mock for @sap-ux/logger

export interface Logger {
    debug: jest.Mock;
    info: jest.Mock;
    warn: jest.Mock;
    error: jest.Mock;
    show?: jest.Mock;
}

export class ExtensionLogger implements Logger {
    debug: jest.Mock;
    info: jest.Mock;
    warn: jest.Mock;
    error: jest.Mock;
    show: jest.Mock;

    constructor(name?: string) {
        this.debug = jest.fn();
        this.info = jest.fn();
        this.warn = jest.fn();
        this.error = jest.fn();
        this.show = jest.fn();
    }
}
