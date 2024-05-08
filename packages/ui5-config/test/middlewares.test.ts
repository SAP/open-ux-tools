import { removeFioriToolsProxyAndAppReload } from '../src';
import editor, { type Editor } from 'mem-fs-editor';
import { ToolsLogger } from '@sap-ux/logger';
import { join } from 'path';

jest.mock('mem-fs-editor', () => ({
    ...jest.requireActual('mem-fs-editor'),
    editor: jest.fn()
}));

describe('removeFioriToolsProxyAndAppReload', () => {
    const testInputPath = join(__dirname, 'test-inputs');
    const yamlPath = join(testInputPath, 'test-cap-java/pom.xml');

    test('should remove Fiori Tools proxy and app reload configurations', async () => {
        const document = `{\"server\":{\"customMiddleware\":[{\"name\":\"fiori-tools-appreload\"}]}}`;
        // Mock the fs module
        const fsMock = {
            ...editor,
            read: jest
                .fn()
                .mockReturnValue(
                    `server:\n  customMiddleware:\n    - name: fiori-tools-proxy\n    - name: fiori-tools-appreload\n`
                ),
            write: jest.fn()
        } as unknown as Editor;
        const logger = new ToolsLogger();
        const loggerMock = jest.fn();
        logger.error = loggerMock;
        // Call the function
        await removeFioriToolsProxyAndAppReload(fsMock, yamlPath, logger);
        // Verify that fs.read was called with the correct path
        expect(fsMock.read).toHaveBeenCalledWith(yamlPath);
        // Verify that fs.write was called with the correct arguments
        expect(fsMock.write).toHaveBeenCalledWith(yamlPath, document);
        // Verify that logger.error was not called (since no error occurred)
        expect(logger.error).not.toHaveBeenCalled();
    });

    test('should log error if file reading fails', async () => {
        // Mock the fs module to throw an error when reading the file
        const fsMock = {
            ...editor,
            read: jest.fn().mockImplementation(() => {
                throw new Error('Error reading file');
            }),
            write: jest.fn()
        } as unknown as Editor;

        const logger = new ToolsLogger();
        const loggerMock = jest.fn();
        logger.error = loggerMock;

        await removeFioriToolsProxyAndAppReload(fsMock, yamlPath, logger);
        // Verify that fs.read was called with the correct path
        expect(fsMock.read).toHaveBeenCalledWith(yamlPath);
        // Verify that fs.write was not called (since an error occurred)
        expect(fsMock.write).not.toHaveBeenCalled();
        // Verify that logger.error was called with the correct error message
        expect(logger.error).toHaveBeenCalledTimes(1);
    });
});
