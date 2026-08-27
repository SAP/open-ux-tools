const noopLogger = {
    fatal: () => {},
    error: () => {},
    warn: () => {},
    info: () => {},
    debug: () => {},
    trace: () => {},
    getChildLogger: () => noopLogger
};
export const getExtensionLogger = () => noopLogger;
export default { getExtensionLogger };
