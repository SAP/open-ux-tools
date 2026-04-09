import { jest } from '@jest/globals';
import { join } from 'node:path';
import type { Editor } from 'mem-fs-editor';
import type { Logger } from '@sap-ux/logger';
import { TemplateType } from '../../src/types';

const mockGenerateAnnotations = jest.fn();
const mockGetCapFolderPathsSync = jest.fn().mockReturnValue({ app: '/mock/app/path' });

jest.unstable_mockModule('@sap-ux/annotation-generator', () => ({
    generateAnnotations: mockGenerateAnnotations
}));

jest.unstable_mockModule('@sap-ux/fiori-generator-shared', () => ({
    getCapFolderPathsSync: mockGetCapFolderPathsSync
}));

const { writeAnnotations } = await import('../../src/writeAnnotations');
const { t } = await import('../../src/i18n');
const { applyBaseConfigToFEApp } = await import('../common');

describe('writeAnnotations', () => {
    let fs: Editor;

    beforeEach(() => {
        fs = {
            write: jest.fn()
        } as unknown as Editor;
    });

    afterEach(() => {
        jest.clearAllMocks();
        jest.resetAllMocks();
    });

    it('should call generateAnnotations with correct parameters', async () => {
        const appInfo = applyBaseConfigToFEApp('test', TemplateType.ListReportObjectPage);
        appInfo.appOptions.addAnnotations = true;
        await writeAnnotations('base', appInfo, fs);

        expect(mockGenerateAnnotations).toHaveBeenCalledWith(
            fs,
            {
                serviceName: 'mainService',
                appName: 'test',
                project: join('test')
            },
            {
                entitySetName: 'Travel',
                annotationFilePath: join('test', 'path', 'test', 'annotations.cds'),
                addFacets: true,
                addLineItems: true,
                addValueHelps: true
            }
        );
    });

    it('should call generateAnnotations with correct parameters for non-CAP service', async () => {
        const appInfo = applyBaseConfigToFEApp('test', TemplateType.ListReportObjectPage);
        appInfo.appOptions.addAnnotations = true;
        delete appInfo.service.capService;

        await writeAnnotations('test', appInfo, fs);

        expect(mockGenerateAnnotations).toHaveBeenCalledWith(
            fs,
            {
                serviceName: 'mainService',
                appName: 'test',
                project: join('test')
            },
            {
                entitySetName: 'Travel',
                annotationFilePath: join('webapp', 'annotations', 'annotation.xml'),
                addFacets: true,
                addLineItems: true,
                addValueHelps: false
            }
        );
    });

    it('should exit gracefully and log an error when generateAnnotations fails', async () => {
        const log = {
            error: jest.fn()
        };
        const appInfo = applyBaseConfigToFEApp('test', TemplateType.ListReportObjectPage);
        appInfo.appOptions.addAnnotations = true;
        delete appInfo.service.capService;
        mockGenerateAnnotations.mockRejectedValue(new Error('test error'));
        await writeAnnotations('test', appInfo, fs, log as unknown as Logger);
        expect(log.error).toHaveBeenCalledWith(`${t('error.errorGeneratingDefaultAnnotations')} Error: test error`);
    });
});
