const { ToolsLogger: Actual } = jest.requireActual('@sap-ux/logger');
export const ToolsLogger = function () {
    return {
        warn: jest.fn()
    };
};
