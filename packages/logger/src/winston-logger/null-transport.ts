import Transport from 'winston-transport';

/**
 * This is a sink, the equivalent of writing to /dev/null
 */
export class NullTransport extends Transport {
    public log(_data: unknown, callback: () => void) {
        callback();
    }
}
