import Transport from 'winston-transport';
import { window, OutputChannel } from 'vscode';

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
    private readonly channel: OutputChannel;
    public constructor(
        options: Transport.TransportStreamOptions & {
            channelName: string;
        }
    ) {
        super(options);
        this.channel = window.createOutputChannel(options.channelName);
    }
    public log(data: DataLog, callback: () => void): void {
        setImmediate(() => {
            this.channel.appendLine(`${data.timestamp} [${data.level.toUpperCase()}] - ${data.message}`);
        });
        callback();
    }
}
