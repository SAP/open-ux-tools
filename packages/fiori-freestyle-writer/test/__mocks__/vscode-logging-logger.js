const mockLogger = {
    fatal: () => {},
    error: () => {},
    warn: () => {},
    info: () => {},
    debug: () => {},
    trace: () => {},
    getChildLogger: () => mockLogger
};

export const getExtensionLogger = () => mockLogger;
export default { getExtensionLogger };
