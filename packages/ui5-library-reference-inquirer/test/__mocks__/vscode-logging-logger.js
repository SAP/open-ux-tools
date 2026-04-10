export const getExtensionLogger = () => ({
    fatal: () => {},
    error: () => {},
    warn: () => {},
    info: () => {},
    debug: () => {},
    trace: () => {},
    getChildLogger: function () {
        return this;
    }
});
