import { readFileSync } from 'fs';
import { join } from 'path';
import type { ToolsLogger } from '@sap-ux/logger';
import { handleCreateFioriCommand } from '../../../src/cli';
import * as loggerMock from '../../../src/tracing/logger';

describe('Test handleCreateFioriCommand()', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('Execute command create-fiori --version', () => {
        // Mock setup
        process.stdout.write = jest.fn() as any;
        jest.spyOn(process, 'exit').mockImplementation(() => {
            // Commander calls process.exit() in case it shows version, which causes issues running test. Throwing handled exception instead.
            throw '';
        });
        const version = JSON.parse(
            readFileSync(join(__dirname, '../../../package.json'), { encoding: 'utf8' }).toString()
        ).version;

        // Test execution
        handleCreateFioriCommand([process.argv[0], 'create-fiori', '--version']);

        // Result check
        expect(process.stdout.write).toBeCalledWith(expect.stringContaining(version));
    });

    test('Execute command create-fiori help, should show help', () => {
        // Mock setup
        const mockLogger = { error: jest.fn(), debug: jest.fn() } as Partial<ToolsLogger> as ToolsLogger;
        jest.spyOn(loggerMock, 'getLogger').mockImplementation(() => mockLogger);
        process.stdout.write = jest.fn() as any;

        // Test execution
        handleCreateFioriCommand([process.argv[0], 'create-fiori', 'help']);

        // Result check
        expect(process.stdout.write).toBeCalledWith(expect.stringContaining('create-fiori [options] [command]'));
        expect(mockLogger.debug).toBeCalledWith(expect.objectContaining({ code: 'commander.help' }));
        expect(mockLogger.error).not.toBeCalled();
    });
});
