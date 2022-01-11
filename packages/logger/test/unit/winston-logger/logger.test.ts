import 'jest-extended';
import { LogLevel, ToolsLogger, Transport } from '../../../src';
import { ConsoleTransport, NullTransport, VSCodeTransport } from '../../../src/transports';

jest.mock(
    'vscode',
    () => {
        return {
            window: {
                createOutputChannel() {
                    return undefined;
                }
            }
        };
    },
    { virtual: true }
);

describe('Winston logger', () => {
    it('Uses a console transport by default', () => {
        const logger = new ToolsLogger();
        expect(logger.transports()).toIncludeSameMembers([new ConsoleTransport()]);
    });
    it('Console transport is only added once', () => {
        const logger = new ToolsLogger({
            transports: Array.from({ length: 500 }, () => new ConsoleTransport()),
            logLevel: LogLevel.Info
        });
        expect(logger.transports()).toIncludeSameMembers([new ConsoleTransport()]);
    });
    it('Null transport is only added once', () => {
        const logger = new ToolsLogger({
            transports: Array.from({ length: 500 }, () => new NullTransport()),
            logLevel: LogLevel.Info
        });
        expect(logger.transports()).toIncludeSameMembers([new NullTransport()]);
    });
    it('VS Code transport is only added once per channel', () => {
        const logger = new ToolsLogger({
            transports: Array.from({ length: 500 }, () => new VSCodeTransport({ channelName: 'sampleChannel' })),
            logLevel: LogLevel.Info
        });
        expect(logger.transports()).toIncludeSameMembers([new VSCodeTransport({ channelName: 'sampleChannel' })]);
    });
    it('Singleton transports (null, console, vscode) are only added once', () => {
        const transports = Array.from({ length: 500 }, (_, i) => {
            if (i % 10 === 0) {
                return new VSCodeTransport({ channelName: 'channel10' });
            } else if (i % 5 === 0) {
                return new VSCodeTransport({ channelName: 'channel5' });
            } else if (i % 2 === 0) {
                return new ConsoleTransport();
            } else {
                return new NullTransport();
            }
        }) as unknown as Transport[];

        const logger = new ToolsLogger({
            transports,
            logLevel: LogLevel.Info
        });
        expect(logger.transports()).toIncludeSameMembers([
            new NullTransport(),
            new ConsoleTransport(),
            new VSCodeTransport({ channelName: 'channel5' }),
            new VSCodeTransport({ channelName: 'channel10' })
        ]);
    });
});
