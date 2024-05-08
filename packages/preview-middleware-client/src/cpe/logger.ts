import Log from 'sap/base/Log';
import { Logger } from '@sap-ux-private/control-property-editor-common';


function getString(message: string | object): string {
    if (typeof message === 'object') {
        return JSON.stringify(message).toString();
    }
    return message;
}

export const logger: Logger = {
    info: (message: string | object) => {
        Log.info(getString(message));
    },
    debug: (message: string | object) => {
        Log.debug(getString(message));
    },
    warn: (message: string | object) => {
        Log.warning(getString(message));
    },
    error: (message: string | object) => {
        Log.error(getString(message));
    }
};

