import { join } from 'path';
import type { EditorWithDump } from '../../../src/types';
import type { ToolsLogger } from '@sap-ux/logger';
import { traceChanges } from '../../../src/tracing';
import * as logger from '../../../src/tracing/logger';

describe('Test traceChanges()', () => {
    let loggerMock: ToolsLogger;

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock setup
        loggerMock = {
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn()
        } as Partial<ToolsLogger> as ToolsLogger;
        jest.spyOn(logger, 'getLogger').mockImplementation(() => loggerMock);
    });

    test.only('New files', async () => {
        // Mock setup
        const newFile = join(__dirname, 'NEW_FILE');
        const fsMock = {
            dump: () => ({ [newFile]: { contents: 'CONTENT', state: 'modified' } })
        } as unknown as EditorWithDump;

        // Test execution
        await traceChanges(fsMock);

        // Result check
        expect(loggerMock.info).toBeCalledWith(expect.stringContaining(`'${newFile}' added`));
        expect(loggerMock.debug).toBeCalledWith('File content:\nCONTENT');
    });
});
