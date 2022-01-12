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
    public constructor(
        options: Transport.TransportStreamOptions & {
            channelName: string;
        }
    ) {
        super(options);
        this.channel = getVSCodeInstance().window.createOutputChannel(options.channelName);
    }
    public log(data: DataLog, callback: () => void): void {
        setImmediate(() => {
            this.channel.appendLine(`${data.timestamp} [${data.level.toUpperCase()}] - ${data.message}`);
        });
        callback();
    }
}

function getVSCodeInstance(): any {
    return require('vscode');
}
