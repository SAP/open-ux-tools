import type { ToolsLogger } from '@sap-ux/logger';

describe('main', () => {
    let loggerMock: jest.Mocked<ToolsLogger>;

    beforeEach(() => {
        loggerMock = {
            info: jest.fn(),
            error: jest.fn(),
            debug: jest.fn(),
            warn: jest.fn()
        } as any;
    });

    test('should ', () => {});
});
