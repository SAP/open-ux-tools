import { doSomething } from '../../src/main';
import type { ToolsLogger } from '@sap-ux/logger';

describe('main', () => {
    let mockLogger: jest.Mocked<ToolsLogger>;

    beforeEach(() => {
        mockLogger = {
            info: jest.fn(),
            error: jest.fn(),
            debug: jest.fn(),
            warn: jest.fn()
        } as any;
    });

    test('should log hello message', () => {
        doSomething(mockLogger);
        expect(mockLogger.info).toHaveBeenCalledWith('Hello from my-new-package!');
    });
});
