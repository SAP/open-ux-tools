import { ToolsLogger } from '@sap-ux/logger';
import type { CapService, CapRuntime } from '@sap-ux/odata-service-inquirer';
import { updateCdsFilesWithAnnotations } from '../../../src/cap-writer/cds-files';
import memFs from 'mem-fs';
import editor from 'mem-fs-editor';
import { join } from 'path';

const capNodeType: CapRuntime = 'Node.js';

describe('writes cds files correctly', () => {
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
        const store = memFs.create();
        const fs = editor.create(store);
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
        const store = memFs.create();
        const fs = editor.create(store);
        const capService: CapService = {
            projectPath: testCAPNoSapUx,
            serviceName: 'AdminService',
            serviceCdsPath: 'srv/admin-service',
            appPath: capAppFolder,
            capType: capNodeType
        };
        const projectName = 'testProject';
        await updateCdsFilesWithAnnotations(fs, capService, projectName);
        const indexCdsPath = join(capService.projectPath, capService.appPath ?? '', 'services.cds');
        expect((fs as any).dump(indexCdsPath)).toMatchSnapshot();
    });

    it('updates index cds correctly', async () => {
        const capAppFolder = 'webapp-with-services';
        const testPath = join(__dirname, '..', '..', 'unit/cap-writer/test-inputs');
        const testProjectNameNoSapUx = 'test-cap-package-no-sapux';
        const testCAPNoSapUx = join(testPath, testProjectNameNoSapUx);
        const store = memFs.create();
        const fs = editor.create(store);
        const capService: CapService = {
            projectPath: testCAPNoSapUx,
            serviceName: 'AdminService',
            serviceCdsPath: 'srv/admin-service',
            appPath: capAppFolder,
            capType: capNodeType
        };
        const projectName = 'testProject';
        const serviceCdsPath = join(capService.projectPath, capService.appPath ?? '', 'services.cds');
        await updateCdsFilesWithAnnotations(fs, capService, projectName);
        expect((fs as any).dump(serviceCdsPath)).toMatchSnapshot();
    });
});
