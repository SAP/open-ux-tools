import { join } from 'path';
import { writeAnnotations } from '../../src/writeAnnotations';
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
