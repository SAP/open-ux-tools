import { updatePomXml } from '../../../src/cap-writer/pom-xml';
import memFs from 'mem-fs';
import { join } from 'path';
import { ToolsLogger } from '@sap-ux/logger';
import editor from 'mem-fs-editor';

describe('Writing pom xml json files for cap java projects', () => {
    const store = memFs.create();
    const fs = editor.create(store);
    const testInputPath = join(__dirname, 'test-inputs');
    const pomPath = join(testInputPath, 'test-cap-java-pom-xml/pom.xml');
    const logger = new ToolsLogger();

    test('should remove ODataAnnotations from manifest json where annotations are defined as an array', async () => {
        updatePomXml(fs, pomPath, logger);
        expect((fs as any).dump(pomPath)).toMatchSnapshot();
    });

    test('should not do anything if pom xml is empty', async () => {
        fs.write = jest.fn();
        const invalidPomPath = join(testInputPath, 'test-cap-java-pom-xml/pom-copyzxs.xml');
        updatePomXml(fs, invalidPomPath);
        // Verify that fs.write is not called
        expect(fs.write).not.toHaveBeenCalled();
    });
});
