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

    const basePath = join(__dirname, '../../fixtures/variants-config');
    const deprecatedConfig = join(basePath, 'deprecated-config');

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
    });
    describe('convertToVirtualPreview', () => {
        test('convert project to virtual preview', async () => {
            getExplicitApprovalToAdjustFilesSpy.mockResolvedValue(true);

            await convertToVirtualPreview(deprecatedConfig, logger, fs);
            expect(checkPrerequisitesSpy).toHaveBeenCalled();
            expect(getExplicitApprovalToAdjustFilesSpy).toHaveBeenCalled();
            expect(updatePreviewMiddlewareConfigsSpy).toHaveBeenCalled();
            expect(renameDefaultSandboxesSpy).toHaveBeenCalled();
            expect(deleteNoLongerUsedFilesSpy).toHaveBeenCalled();
            expect(updateVariantsCreationScriptSpy).toHaveBeenCalled();
        });

        test('convert project to virtual preview without fs instance', async () => {
            const fs = await convertToVirtualPreview(deprecatedConfig, logger);
            expect(fs).toBeDefined();
        });

        test('do not convert project to virtual preview - missing prerequisites', async () => {
            await expect(convertToVirtualPreview(basePath, logger, fs)).rejects.toThrowError(
                `Prerequisites not met. See above log messages for details.`
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

            await convertToVirtualPreview(deprecatedConfig, logger, fs);
            expect(checkPrerequisitesSpy).toHaveBeenCalled();
            expect(getExplicitApprovalToAdjustFilesSpy).toHaveBeenCalled();
            expect(errorLogMock).toHaveBeenCalledWith('Approval not given. Conversion aborted.');
        });
    });
});
