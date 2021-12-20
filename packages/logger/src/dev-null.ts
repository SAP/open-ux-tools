import { Logger } from 'types';

export class DevNullLogger implements Logger {
    info() {
        // logging to /dev/null
    }

    warn() {
        // logging to /dev/null
    }

    error() {
        // logging to /dev/null
    }
}
