import { create as createStorage } from 'mem-fs';
import { create, type Editor } from 'mem-fs-editor';
import { convertToVirtualPreview } from '../../../src/preview-config';
import { join } from 'path';
import { ToolsLogger } from '@sap-ux/logger';
import * as packageJson from '../../../src/preview-config/package-json';
import * as previewFiles from '../../../src/preview-config/preview-files';
import * as prerequisites from '../../../src/preview-config/prerequisites';
import * as ui5Yaml from '../../../src/preview-config/ui5-yaml';

describe('index', () => {
    const logger = new ToolsLogger();
    const errorLogMock = jest.spyOn(ToolsLogger.prototype, 'error').mockImplementation(() => {});

    const basePath = join(__dirname, '../../fixtures/preview-config');

    let fs: Editor;

    const updateVariantsCreationScriptSpy = jest.spyOn(packageJson, 'updateVariantsCreationScript');
    const updatePreviewMiddlewareConfigsSpy = jest.spyOn(ui5Yaml, 'updatePreviewMiddlewareConfigs');
    const renameDefaultSandboxesSpy = jest.spyOn(previewFiles, 'renameDefaultSandboxes');
    const checkPrerequisitesSpy = jest.spyOn(prerequisites, 'checkPrerequisites');
    const getExplicitApprovalToAdjustFilesSpy = jest.spyOn(prerequisites, 'getExplicitApprovalToAdjustFiles');
    const deleteNoLongerUsedFilesSpy = jest.spyOn(previewFiles, 'deleteNoLongerUsedFiles');

    beforeEach(() => {
        jest.clearAllMocks();
        fs = create(createStorage());
        fs.write(
            join(basePath, 'package.json'),
            JSON.stringify({
                devDependencies: { '@ui5/cli': '3.0.0', '@sap-ux/ui5-middleware-fe-mockserver': '6.6.6' }
            })
        );
    });
    describe('convertToVirtualPreview', () => {
        test('convert project to virtual preview', async () => {
            getExplicitApprovalToAdjustFilesSpy.mockResolvedValue(true);

            await convertToVirtualPreview(basePath, false, logger, fs);
            expect(checkPrerequisitesSpy).toHaveBeenCalled();
            expect(getExplicitApprovalToAdjustFilesSpy).toHaveBeenCalled();
            expect(updatePreviewMiddlewareConfigsSpy).toHaveBeenCalled();
            expect(renameDefaultSandboxesSpy).toHaveBeenCalled();
            expect(deleteNoLongerUsedFilesSpy).toHaveBeenCalled();
            expect(updateVariantsCreationScriptSpy).toHaveBeenCalled();
        });

        test('do not convert project to virtual preview - missing prerequisites', async () => {
            const missingPrerequisitesPath = join(basePath, 'missingPrerequisites');
            fs.write(
                join(missingPrerequisitesPath, 'package.json'),
                JSON.stringify({ devDependencies: { '@ui5/cli': '2.0.0' } })
            );

            await expect(convertToVirtualPreview(missingPrerequisitesPath, false, logger, fs)).rejects.toThrowError(
                `The prerequisites are not met. For more information, see the log messages above.`
            );
            expect(checkPrerequisitesSpy).toHaveBeenCalled();
            expect(getExplicitApprovalToAdjustFilesSpy).not.toHaveBeenCalled();
            expect(updatePreviewMiddlewareConfigsSpy).not.toHaveBeenCalled();
            expect(renameDefaultSandboxesSpy).not.toHaveBeenCalled();
            expect(deleteNoLongerUsedFilesSpy).not.toHaveBeenCalled();
            expect(updateVariantsCreationScriptSpy).not.toHaveBeenCalled();
        });

        test('do not convert project to virtual preview - missing approval', async () => {
            getExplicitApprovalToAdjustFilesSpy.mockResolvedValue(false);

            await convertToVirtualPreview(basePath, false, logger, fs);
            expect(checkPrerequisitesSpy).toHaveBeenCalled();
            expect(getExplicitApprovalToAdjustFilesSpy).toHaveBeenCalled();
            expect(errorLogMock).toHaveBeenCalledWith(
                'You have not approved the conversion. The conversion has been aborted.'
            );
        });
    });
});
