import { toWinstonLogLevel, toWinstonTransport } from '../../../src/winston-logger/adapter';
import winston from 'winston';
import { LogLevel, Transport } from '../../../src/types';
import { ConsoleTransport, FileTransport, NullTransport, VSCodeTransport } from '../../../src/transports';
import { NullTransport as WinstonNullTransport } from '../../../src/winston-logger/null-transport';
import { VSCodeTransport as WinstonVSCodeTransport } from '../../../src/winston-logger/vscode-output-channel-transport';

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

jest.mock('winston', () => {
    const original = jest.requireActual('winston');
    return {
        ...original,
        transports: {
            ...original.transports,
            File: class {}
        }
    };
});

describe('toWinstonLogLevel', () => {
    it('defaults to undefined', () => {
        expect(toWinstonLogLevel()).toBeUndefined();
    });
    test.each([
        [LogLevel.Debug, 'debug'],
        [LogLevel.Error, 'error'],
        [LogLevel.Info, 'info'],
        [LogLevel.Silly, 'silly'],
        [LogLevel.Verbose, 'verbose'],
        [LogLevel.Warn, 'warn']
    ])('convert %s -> %s', (logLevel: LogLevel, expected: string) => {
        expect(toWinstonLogLevel(logLevel)).toStrictEqual(expected);
    });
});

class UnsupportedTransport extends Transport {}

describe('toWinstonTransport', () => {
    test.each([
        [new NullTransport(), WinstonNullTransport],
        [new ConsoleTransport(), winston.transports.Console],
        [new FileTransport({ filename: 'foo' }), winston.transports.File],
        [new VSCodeTransport({ channelName: 'foo' }), WinstonVSCodeTransport]
    ])('convert Transport %#', (transport, winstonTransportClass) => {
        expect(toWinstonTransport(transport)).toBeInstanceOf(winstonTransportClass);
    });

    it('throws an error when transport type is unrecognized', () => {
        expect(() => toWinstonTransport(new UnsupportedTransport())).toThrow(/unrecognized\s+transport/i);
    });
});
