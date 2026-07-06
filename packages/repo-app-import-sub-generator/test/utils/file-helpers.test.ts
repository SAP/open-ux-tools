import { jest } from '@jest/globals';
import type { Editor } from 'mem-fs-editor';
import { t } from '../../src/utils/i18n.js';
import { join } from 'node:path';
import { PromptState } from '../../src/prompts/prompt-state.js';
import { TemplateType } from '@sap-ux/fiori-elements-writer';
import { TemplateType as FioriFreestyleTemplateType } from '@sap-ux/fiori-freestyle-writer';

jest.mock('adm-zip');

jest.unstable_mockModule('../../src/utils/logger', () => {
    const mock = {
        logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() },
        configureLogging: jest.fn()
    };
    return { default: mock, ...mock };
});

const { readManifest, makeValidJson, addPackageJsonIfNotFound, cleanupArtifacts, getTemplateTypeFromManifest } =
    await import('../../src/utils/file-helpers.js');
const RepoAppDownloadLogger = (await import('../../src/utils/logger.js')).default;

describe('readManifest', () => {
    const mockReadJSON = jest.fn();
    const mockFs = { readJSON: mockReadJSON, exists: jest.fn() } as unknown as Editor;
    const extractedProjectPath = 'project-path';

    afterEach(() => {
        jest.clearAllMocks();
        jest.restoreAllMocks();
    });

    it('should return manifest when valid manifest is read', async () => {
        const validManifest = {
            'sap.app': {
                id: 'test-app'
            }
        };
        mockReadJSON.mockReturnValue(validManifest);
        const manifestFilePath = join(extractedProjectPath, 'manifest.json');
        const result = readManifest(manifestFilePath, mockFs);
        expect(result).toBe(validManifest);
        expect(mockFs.readJSON).toHaveBeenCalledWith(manifestFilePath);
    });

    it('should throw an error if manifest is not found', async () => {
        mockReadJSON.mockReturnValue(null);
        readManifest(extractedProjectPath, mockFs);
        expect(RepoAppDownloadLogger.logger.error).toHaveBeenCalledWith(
            t('error.readManifestErrors.readManifestFailed')
        );
    });

    it('should throw an error if "sap.app" is not defined in the manifest', async () => {
        const invalidManifestNoSapApp = {
            // No 'sap.app' field
        };
        // Mock fs readJSON function to return a manifest without 'sap.app'
        mockReadJSON.mockReturnValue(invalidManifestNoSapApp);
        readManifest(extractedProjectPath, mockFs);
        expect(RepoAppDownloadLogger.logger.error).toHaveBeenCalledWith(t('error.readManifestErrors.sapAppNotDefined'));
    });
});

describe('makeValidJson', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should throw an error when file contents are not valid JSON', () => {
        const mockFs = { read: jest.fn().mockReturnValue('not valid json') } as unknown as Editor;
        expect(() => makeValidJson('some/path/qfa.json', mockFs)).toThrow(
            t('error.errorProcessingJsonFile', { error: expect.anything() })
        );
    });
});

describe('cleanupArtifacts', () => {
    const mockFs = {
        exists: jest.fn(),
        delete: jest.fn(),
        write: jest.fn()
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should copy -dbg.js content to corresponding .js file and delete debug file', () => {
        const dbgContent = 'unminified content';
        const entries = [{ entryName: 'Component-dbg.js', getData: jest.fn(() => Buffer.from(dbgContent)) }];
        const mockAdmZip = { getEntries: jest.fn(() => entries) };
        (PromptState as any)['_admZipInstance'] = mockAdmZip;

        cleanupArtifacts('/webapp', mockFs as any);

        expect(mockFs.write).toHaveBeenCalledWith(join('/webapp', 'Component.js'), dbgContent);
        expect(mockFs.delete).toHaveBeenCalledWith(join('/webapp', 'Component-dbg.js'));
    });

    it('should copy -dbg.controller.js content to corresponding .controller.js file and delete debug file', () => {
        const dbgContent = 'unminified controller content';
        const entries = [
            {
                entryName: 'ext/view/Main-dbg.controller.js',
                getData: jest.fn(() => Buffer.from(dbgContent))
            }
        ];
        const mockAdmZip = { getEntries: jest.fn(() => entries) };
        (PromptState as any)['_admZipInstance'] = mockAdmZip;

        cleanupArtifacts('/webapp', mockFs as any);

        expect(mockFs.write).toHaveBeenCalledWith(join('/webapp', 'ext/view/Main.controller.js'), dbgContent);
        expect(mockFs.delete).toHaveBeenCalledWith(join('/webapp', 'ext/view/Main-dbg.controller.js'));
    });

    it('should delete preload, source map, and controller map files', () => {
        const entries = [
            { entryName: 'Component-preload.js' },
            { entryName: 'Component.js.map' },
            { entryName: 'ext/view/Main.controller.js.map' },
            { entryName: 'Component.js' }
        ];
        const mockAdmZip = { getEntries: jest.fn(() => entries) };
        (PromptState as any)['_admZipInstance'] = mockAdmZip;
        mockFs.exists.mockReturnValue(true);

        cleanupArtifacts('/webapp', mockFs as any);

        expect(mockFs.delete).toHaveBeenCalledWith(join('/webapp', 'Component-preload.js'));
        expect(mockFs.delete).toHaveBeenCalledWith(join('/webapp', 'Component.js.map'));
        expect(mockFs.delete).toHaveBeenCalledWith(join('/webapp', 'ext/view/Main.controller.js.map'));
        expect(mockFs.delete).not.toHaveBeenCalledWith(join('/webapp', 'Component.js'));
    });

    it('should not delete preload or map file if it does not exist in mem-fs', () => {
        const entries = [{ entryName: 'Component-preload.js' }];
        const mockAdmZip = { getEntries: jest.fn(() => entries) };
        (PromptState as any)['_admZipInstance'] = mockAdmZip;
        mockFs.exists.mockReturnValue(false);

        cleanupArtifacts('/webapp', mockFs as any);

        expect(mockFs.delete).not.toHaveBeenCalled();
    });

    it('should remove transpiled .js file when a corresponding .ts file exists', () => {
        const entries = [
            { entryName: 'Component.ts' },
            { entryName: 'Component.js' },
            { entryName: 'ext/view/Main.controller.ts' },
            { entryName: 'ext/view/Main.controller.js' }
        ];
        (PromptState as any)['_admZipInstance'] = { getEntries: jest.fn(() => entries) };
        mockFs.exists.mockReturnValue(true);

        cleanupArtifacts('/webapp', mockFs as any);

        expect(mockFs.delete).toHaveBeenCalledWith(join('/webapp', 'Component.js'));
        expect(mockFs.delete).toHaveBeenCalledWith(join('/webapp', 'ext/view/Main.controller.js'));
    });

    it('should not remove .js file when no corresponding .ts file exists', () => {
        const entries = [{ entryName: 'Component.js' }];
        (PromptState as any)['_admZipInstance'] = { getEntries: jest.fn(() => entries) };
        mockFs.exists.mockReturnValue(true);

        cleanupArtifacts('/webapp', mockFs as any);

        expect(mockFs.delete).not.toHaveBeenCalled();
    });

    it('should not delete transpiled .js file if it does not exist in mem-fs', () => {
        const entries = [{ entryName: 'Component.ts' }, { entryName: 'Component.js' }];
        (PromptState as any)['_admZipInstance'] = { getEntries: jest.fn(() => entries) };
        mockFs.exists.mockReturnValue(false);

        cleanupArtifacts('/webapp', mockFs as any);

        expect(mockFs.delete).not.toHaveBeenCalled();
    });

    it('should do nothing when admZip is not set', () => {
        PromptState.reset();

        cleanupArtifacts('/webapp', mockFs as any);

        expect(mockFs.delete).not.toHaveBeenCalled();
        expect(mockFs.write).not.toHaveBeenCalled();
    });
});

describe('addPackageJsonIfNotFound', () => {
    const mockFs = {
        exists: jest.fn(),
        writeJSON: jest.fn()
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should write package.json for an app when it does not already exist', () => {
        mockFs.exists.mockReturnValue(false);
        addPackageJsonIfNotFound(
            '/project',
            { app: { id: 'my.app.id' }, template: { type: TemplateType.ListReportObjectPage } } as any,
            mockFs as unknown as Editor
        );
        expect(mockFs.writeJSON).toHaveBeenCalledWith(join('/project', 'package.json'), { name: 'my.app.id' });
    });

    it('should not write package.json when it already exists', () => {
        mockFs.exists.mockReturnValue(true);
        addPackageJsonIfNotFound(
            '/project',
            { app: { id: 'my.app.id' }, template: { type: TemplateType.ListReportObjectPage } } as any,
            mockFs as unknown as Editor
        );
        expect(mockFs.writeJSON).not.toHaveBeenCalled();
    });
});

describe('getTemplateTypeFromManifest', () => {
    it.each([
        [TemplateType.ListReportObjectPage, '@sap/generator-fiori:lrop'],
        [TemplateType.FlexibleProgrammingModel, '@sap/generator-fiori:fpm'],
        [TemplateType.Worklist, '@sap/generator-fiori:worklist'],
        [TemplateType.AnalyticalListPage, '@sap/generator-fiori:alp'],
        [TemplateType.OverviewPage, '@sap/generator-fiori:ovp'],
        [TemplateType.FormEntryObjectPage, '@sap/generator-fiori:feop'],
        [FioriFreestyleTemplateType.Basic, '@sap/generator-fiori:basic'],
        [FioriFreestyleTemplateType.ListDetail, '@sap/generator-fiori:listdetail']
    ])('should return "%s" for sourceTemplate id "%s"', (expected, sourceTemplateId) => {
        const manifest = { 'sap.app': { sourceTemplate: { id: sourceTemplateId } } } as any;
        expect(getTemplateTypeFromManifest(manifest)).toBe(expected);
    });

    it('should return "unknown" when sourceTemplate id has unknown suffix', () => {
        const manifest = { 'sap.app': { sourceTemplate: { id: '@sap/generator-fiori:custom' } } } as any;
        expect(getTemplateTypeFromManifest(manifest)).toBe('unknown');
    });

    it('should return "unknown" when sourceTemplate id does not start with the fiori prefix', () => {
        const manifest = { 'sap.app': { sourceTemplate: { id: '@sap/generator-other:lrop' } } } as any;
        expect(getTemplateTypeFromManifest(manifest)).toBe('unknown');
    });

    it('should return "unknown" when sourceTemplate is absent', () => {
        const manifest = { 'sap.app': {} } as any;
        expect(getTemplateTypeFromManifest(manifest)).toBe('unknown');
    });

    it('should return "unknown" when manifest is undefined', () => {
        expect(getTemplateTypeFromManifest(undefined as any)).toBe('unknown');
    });
});
