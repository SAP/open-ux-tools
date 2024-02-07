import Transport from 'winston-transport';

/**
 * Interface for function arguments that get passed into the
 * log function by winston,set in vscodeTransport
 * createLogger() and log()
 */
interface DataLog {
    timestamp: string;
    message: string;
    level: string;
}
/**
 * Winston transport for output to VSCode channel
 */
export class VSCodeTransport extends Transport {
    private readonly channel: any;
    private readonly winstonToVSCodeMap: Map<string, string> = new Map([
        ['error', 'error'],
        ['warn', 'warn'],
        ['info', 'info'],
        ['verbose', 'debug'],
        ['debug', 'debug'],
        ['silly', 'trace']
    ]);

    public constructor(
        options: Transport.TransportStreamOptions & {
            channelName: string;
        }
    ) {
        super(options);
        this.channel = getVSCodeInstance().window.createOutputChannel(options.channelName, { log: true });
    }
    public log(data: DataLog, callback: () => void): void {
        setImmediate(() => {
            const logFunction = this.winstonToVSCodeMap.get(data.level) ?? 'info';
            this.channel[logFunction](data.message);
        });
        callback();
    }
    public show(): void {
        this.channel.show();
    }
}

function getVSCodeInstance(): any {
    return require('vscode');
}
