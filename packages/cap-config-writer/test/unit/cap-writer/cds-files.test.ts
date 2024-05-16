import { ToolsLogger } from '@sap-ux/logger';
import type { CapService, CapRuntime } from '@sap-ux/odata-service-inquirer';
import { updateCdsFilesWithAnnotations } from '../../../src/cap-writer/cds-files';
import memFs from 'mem-fs';
import editor, { type Editor } from 'mem-fs-editor';
import { join } from 'path';

const capNodeType: CapRuntime = 'Node.js';

describe('writes cds files correctly', () => {
    let fs: Editor;

    // beforeEach function to reset fs before each test
    beforeEach(() => {
        const store = memFs.create();
        // Create a new instance of the Editor class before each test
        fs = editor.create(store);
    });

    it('calls logger.info with correct messages', async () => {
        const capAppFolder = 'webapp';
        const testPath = join(__dirname, '..', '..', 'test-inputs');
        const testProjectNameNoSapUx = 'test-cap-package-no-sapux';
        const testCAPNoSapUx = join(testPath, testProjectNameNoSapUx);
        const capService: CapService = {
            projectPath: testCAPNoSapUx,
            serviceName: 'AdminService',
            serviceCdsPath: 'srv/admin-service',
            appPath: capAppFolder,
            capType: capNodeType
        };
        const projectName = 'testProject';
        const logger = new ToolsLogger();
        const loggerMock = jest.fn();
        logger.info = loggerMock;
        await updateCdsFilesWithAnnotations(fs, capService, projectName, logger);
        // check if log messages are being logged correctly
        expect(logger.info).toHaveBeenCalledTimes(2);
        expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('cap service name'));
        expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Update cds file with'));
    });

    it('updates index cds correctly', async () => {
        const capAppFolder = 'webapp';
        const testPath = join(__dirname, '..', '..', 'unit/cap-writer/test-inputs');
        const testProjectNameNoSapUx = 'test-cap-package-no-sapux';
        const testCAPNoSapUx = join(testPath, testProjectNameNoSapUx);
        const capService: CapService = {
            projectPath: testCAPNoSapUx,
            serviceName: 'AdminService',
            serviceCdsPath: 'srv/admin-service',
            appPath: capAppFolder,
            capType: capNodeType
        };
        const projectName = 'testProject';
        await updateCdsFilesWithAnnotations(fs, capService, projectName);
        const indexCdsPath = join(capService.projectPath, capService.appPath ?? '', 'index.cds');
        const receivedContents = (fs as any).dump(indexCdsPath);
        const expectedContents = {
            '../testProject/annotations.cds': {
                contents: "using AdminService as service from '../../srv/admin-service';",
                state: 'modified'
            },
            '': {
                contents: "\n\nusing from './testProject/annotations';",
                state: 'modified'
            }
        };
        expect(receivedContents).toEqual(expectedContents);
    });
});
