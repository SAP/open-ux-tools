import { join } from 'path';
import { canGenerateAnnotationsForTemplate, writeAnnotations } from '../../src/writeAnnotations';
import { TemplateType } from '../../src/types';
import { OdataVersion } from '@sap-ux/odata-service-writer';
import { generateAnnotations } from '@sap-ux/annotation-generator';
import type { Editor } from 'mem-fs-editor';
import { applyBaseConfigToFEApp } from '../common';

jest.mock('@sap-ux/annotation-generator', () => ({
    ...jest.requireActual('@sap-ux/annotation-generator'),
    generateAnnotations: jest.fn()
}));

jest.mock('@sap-ux/fiori-generator-shared', () => ({
    ...jest.requireActual('@sap-ux/fiori-generator-shared'),
    getCapFolderPathsSync: jest.fn().mockReturnValue({ app: '/mock/app/path' })
}));

describe('canGenerateAnnotationsForTemplate', () => {
    it('should return true if annotations are enabled and template type is supported with OData v4', () => {
        const result = canGenerateAnnotationsForTemplate(OdataVersion.v4, TemplateType.ListReportObjectPage, true);
        expect(result).toBe(true);
    });

    it('should return false if annotations are enabled but template type is not supported', () => {
        const result = canGenerateAnnotationsForTemplate(OdataVersion.v4, TemplateType.OverviewPage, true);
        expect(result).toBe(false);
    });

    it('should return false if annotations are not enabled', () => {
        const result = canGenerateAnnotationsForTemplate(OdataVersion.v4, TemplateType.ListReportObjectPage, false);
        expect(result).toBe(false);
    });

    it('should return false if OData version is v2', () => {
        const result = canGenerateAnnotationsForTemplate(OdataVersion.v2, TemplateType.ListReportObjectPage, true);
        expect(result).toBe(false);
    });
});

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

        expect(generateAnnotations).toHaveBeenCalledWith(
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

        expect(generateAnnotations).toHaveBeenCalledWith(
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
});
