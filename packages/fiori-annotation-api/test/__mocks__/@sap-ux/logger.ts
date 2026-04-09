export const ToolsLogger = function () {
    return {
        log: jest.fn(),
        warn: jest.fn()
    };
};
