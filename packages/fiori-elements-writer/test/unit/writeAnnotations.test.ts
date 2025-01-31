import { join } from 'path';
import { canGenerateAnnotationsForTemplate, writeAnnotations } from '../../src/data/writeAnnotations';
import { TemplateType } from '../../src/types';
import { OdataVersion } from '@sap-ux/odata-service-writer';
import { generateAnnotations } from '@sap-ux/annotation-generator';
import type { Editor } from 'mem-fs-editor';
import { sampleCapService } from '../common';

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
        const result = canGenerateAnnotationsForTemplate(true, OdataVersion.v4, TemplateType.ListReportObjectPage);
        expect(result).toBe(true);
    });

    it('should return false if annotations are enabled but template type is not supported', () => {
        const result = canGenerateAnnotationsForTemplate(true, OdataVersion.v4, TemplateType.OverviewPage);
        expect(result).toBe(false);
    });

    it('should return false if annotations are not enabled', () => {
        const result = canGenerateAnnotationsForTemplate(false, OdataVersion.v4, TemplateType.ListReportObjectPage);
        expect(result).toBe(false);
    });

    it('should return false if OData version is v2', () => {
        const result = canGenerateAnnotationsForTemplate(true, OdataVersion.v2, TemplateType.ListReportObjectPage);
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

    it('should call generateAnnotations with correct parameters', async () => {
        const appInfo = {
            templateType: TemplateType.ListReportObjectPage,
            entitySetName: 'MyEntitySet',
            packageName: 'test',
            capService: sampleCapService
        };

        await writeAnnotations('base', appInfo, fs);

        expect(generateAnnotations).toHaveBeenCalledWith(
            fs,
            {
                serviceName: 'mainService',
                appName: 'test',
                project: join('test')
            },
            {
                entitySetName: 'MyEntitySet',
                annotationFilePath: join('test', 'path', 'test', 'annotations.cds'),
                addFacets: true,
                addLineItems: true,
                addValueHelps: true
            }
        );
    });

    it('should call generateAnnotations with correct parameters for non-CAP service', async () => {
        const appInfo = {
            templateType: TemplateType.Worklist,
            entitySetName: 'AnotherEntitySet',
            packageName: 'anotherApp'
        };

        await writeAnnotations('/base/path', appInfo, fs);

        expect(generateAnnotations).toHaveBeenCalledWith(
            fs,
            {
                serviceName: 'mainService',
                appName: 'anotherApp',
                project: '/base/path'
            },
            {
                entitySetName: 'AnotherEntitySet',
                annotationFilePath: 'webapp/annotations/annotation.xml',
                addFacets: true,
                addLineItems: true,
                addValueHelps: false
            }
        );
    });
});
