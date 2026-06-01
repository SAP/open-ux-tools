export function getExtensionLogger() {
    return {
        info() {},
        warn() {},
        error() {},
        debug() {},
        trace() {},
        fatal() {},
        getChildLogger() {
            return { info() {}, warn() {}, error() {}, debug() {}, trace() {}, fatal() {} };
        }
    };
}

export const NOOP_LOGGER = {};
