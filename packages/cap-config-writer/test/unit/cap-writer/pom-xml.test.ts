import { updatePomXml } from '../../../src/cap-writer/pom-xml';
import memFs from 'mem-fs';
import { join } from 'path';
import { ToolsLogger } from '@sap-ux/logger';
import editor from 'mem-fs-editor';
import type { Logger } from '@sap-ux/logger';

describe('Writing pom xml json files for cap java projects', () => {
    const store = memFs.create();
    const fs = editor.create(store);
    const testInputPath = join(__dirname, 'test-inputs');
    const pomPath = join(testInputPath, 'test-cap-java/pom.xml');
    const logger = new ToolsLogger();

    test('should correctly update pom xml files', async () => {
        updatePomXml(fs, pomPath, logger);
        expect((fs as any).dump(pomPath)).toMatchSnapshot();
    });

    test('should not do anything if pom xml is empty', async () => {
        const mockedResult = '';
        jest.spyOn(fs, 'write');
        jest.spyOn(fs, 'read').mockReturnValue(mockedResult as any);
        updatePomXml(fs, pomPath);
        // Verify that fs.write is not called
        expect(fs.write).not.toHaveBeenCalled();
    });

    test('should log error while updating pom file', async () => {
        const fsMock = {
            ...fs,
            // Mock readPomXml to throw an error
            read: jest.fn().mockImplementation(() => {
                throw new Error('Error reading pom.xml');
            })
        };
        const loggerMock = {
            error: jest.fn()
        } as unknown as Logger;
        updatePomXml(fsMock, pomPath, loggerMock);
        // Verify that fs.write is not called
        expect(fs.write).not.toHaveBeenCalled();
        // check if log error are being logged correctly
        expect(loggerMock.error).toHaveBeenCalledWith(new Error('Error reading pom.xml'));
    });
});
