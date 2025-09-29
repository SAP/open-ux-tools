const { ToolsLogger: Actual } = jest.requireActual('@sap-ux/logger');
export const ToolsLogger = function () {
    return {
        log: jest.fn(),
        warn: jest.fn()
    };
};
